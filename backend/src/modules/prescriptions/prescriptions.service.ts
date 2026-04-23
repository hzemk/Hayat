import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '@prisma-db/prisma.service';
import { AuditService } from '@common/audit/audit.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ScanPrescriptionDto } from './dto/scan-prescription.dto';

const SCAN_SYSTEM_PROMPT = `You are a medical OCR assistant. The user will upload a photo of a prescription written by a doctor (handwritten or printed). Extract each prescribed medication into a strict JSON structure.

Return ONLY valid JSON, no markdown fences, no commentary. Schema:
{
  "notes": "optional short summary of the prescription purpose — e.g. 'Upper respiratory infection'",
  "items": [
    {
      "medicationName": "drug brand or generic name",
      "dose": "e.g. 500mg, 5ml",
      "frequency": "e.g. Twice daily, Every 8 hours",
      "durationDays": 7,
      "instructionsEn": "optional English instructions — e.g. 'After meals'",
      "instructionsAr": "optional Arabic instructions if visible"
    }
  ]
}

Rules:
- If a field is unclear or not present, omit it (do NOT invent).
- If the image is not a prescription or is unreadable, return {"items": [], "notes": "Could not read prescription"}.
- Keep medicationName concise (no instructions mixed in).
- durationDays must be an integer in days (convert weeks → days).
- Preserve dose units as written.
- Never include advice, disclaimers, or natural-language outside the JSON.`;

export interface ScanResult {
  notes?: string;
  items: Array<{
    medicationName: string;
    dose: string;
    frequency: string;
    durationDays?: number;
    instructionsEn?: string;
    instructionsAr?: string;
  }>;
}

type ScanProvider = 'groq' | 'anthropic';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);
  private readonly anthropic: Anthropic | null;
  private readonly anthropicModel: string;
  private readonly groqApiKey: string | undefined;
  private readonly groqModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    const anthropicKey = this.config.get<string>('ai.apiKey');
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
    this.anthropicModel = this.config.get<string>('ai.model') ?? 'claude-sonnet-4-6';
    this.groqApiKey = this.config.get<string>('groq.apiKey');
    this.groqModel =
      this.config.get<string>('groq.model') ??
      'meta-llama/llama-4-scout-17b-16e-instruct';
  }

  private pickProvider(): ScanProvider | null {
    if (this.groqApiKey) return 'groq';
    if (this.anthropic) return 'anthropic';
    return null;
  }

  async listMine(userId: string) {
    const rows = await this.prisma.prescription.findMany({
      where: { patientId: userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        items: true,
        doctorUser: { select: { fullName: true } },
      },
    });
    return rows.map((rx) => withSource(rx));
  }

  async getById(userId: string, id: string) {
    const rx = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        doctorUser: { select: { fullName: true } },
      },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.patientId !== userId) throw new ForbiddenException();
    return withSource(rx);
  }

  async createRemindersFromPrescription(userId: string, prescriptionId: string) {
    const rx = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.patientId !== userId) throw new ForbiddenException();
    if (rx.items.length === 0) {
      throw new BadRequestException('Prescription has no medications');
    }

    // Drop any PRESCRIPTION-sourced reminders previously generated for this
    // prescription's meds so repeated "done" taps stay idempotent.
    const existingTitles = rx.items.map(
      (i) => `${i.medicationName} ${i.dose}`.trim(),
    );
    await this.prisma.reminder.deleteMany({
      where: {
        userId,
        source: 'PRESCRIPTION',
        title: { in: existingTitles },
      },
    });

    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const startAt = new Date(Date.now() + hourMs);

    const created = await this.prisma.reminder.createMany({
      data: rx.items.map((item, idx) => {
        const title = `${item.medicationName} ${item.dose}`.trim();
        const subtitle =
          item.instructionsEn ??
          item.instructionsAr ??
          item.frequency ??
          null;
        const scheduledAt = new Date(startAt.getTime() + idx * 15 * 60 * 1000);
        const endsAt = item.durationDays
          ? new Date(scheduledAt.getTime() + item.durationDays * dayMs)
          : null;
        return {
          userId,
          type: 'MEDICATION' as const,
          title,
          subtitle,
          scheduledAt,
          endsAt,
          recurrence: 'daily',
          source: 'PRESCRIPTION' as const,
        };
      }),
    });

    return { created: created.count, prescriptionId };
  }

  async create(userId: string, dto: CreatePrescriptionDto) {
    const rx = await this.prisma.prescription.create({
      data: {
        patientId: userId,
        doctorUserId: userId,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            medicationName: i.medicationName,
            dose: i.dose,
            frequency: i.frequency,
            durationDays: i.durationDays,
            instructionsAr: i.instructionsAr,
            instructionsEn: i.instructionsEn,
          })),
        },
      },
      include: {
        items: true,
        doctorUser: { select: { fullName: true } },
      },
    });
    void this.audit.record({
      userId,
      action: 'prescription.issue',
      resource: 'Prescription',
      resourceId: rx.id,
      metadata: { source: 'SCAN', itemCount: rx.items.length },
    });
    return withSource(rx);
  }

  async scan(_userId: string, dto: ScanPrescriptionDto): Promise<ScanResult> {
    const provider = this.pickProvider();
    if (!provider) {
      throw new ServiceUnavailableException(
        'Prescription scanner is not configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY on the backend.',
      );
    }

    try {
      const raw =
        provider === 'groq'
          ? await this.callGroq(dto)
          : await this.callAnthropic(dto);

      const parsed = safeParse(stripFences(raw));
      if (!parsed || !Array.isArray(parsed.items)) {
        this.logger.warn(
          `Scanner (${provider}) returned invalid JSON`,
          raw.slice(0, 200),
        );
        throw new BadRequestException(
          'Could not read prescription — try a clearer photo',
        );
      }
      return normalizeScanResult(parsed);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(
        `Prescription scan failed (${provider})`,
        err as Error,
      );
      // Surface the real upstream message so the mobile UI can show "out of
      // credits" / "rate limited" instead of a generic black box.
      const msg = err instanceof Error ? err.message : 'Scanner failed';
      throw new ServiceUnavailableException(msg.slice(0, 300));
    }
  }

  private async callAnthropic(dto: ScanPrescriptionDto): Promise<string> {
    const response = await this.anthropic!.messages.create({
      model: this.anthropicModel,
      max_tokens: 2048,
      temperature: 0,
      system: SCAN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: dto.mimeType,
                data: dto.imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract the medications from this prescription image. Return JSON only.',
            },
          ],
        },
      ],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }

  private async callGroq(dto: ScanPrescriptionDto): Promise<string> {
    const dataUrl = `data:${dto.mimeType};base64,${dto.imageBase64}`;
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: this.groqModel,
          temperature: 0,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SCAN_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract the medications from this prescription image. Return JSON only.',
                },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

type PrescriptionSource = 'DOCTOR' | 'SCAN';

function withSource<T extends { doctorId: string | null; patientId: string; doctorUserId: string }>(
  rx: T,
): T & { source: PrescriptionSource } {
  const source: PrescriptionSource =
    rx.doctorId && rx.doctorUserId !== rx.patientId ? 'DOCTOR' : 'SCAN';
  return { ...rx, source };
}

// TODO(hardening): address in dedicated cleanup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeScanResult(parsed: any): ScanResult {
  return {
    notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
    items: parsed.items
      .filter(
        // TODO(hardening): address in dedicated cleanup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) =>
          i &&
          typeof i.medicationName === 'string' &&
          i.medicationName.trim().length > 0,
      )
      // TODO(hardening): address in dedicated cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => ({
        medicationName: String(i.medicationName).trim().slice(0, 200),
        dose: String(i.dose ?? '').trim().slice(0, 80) || 'Not specified',
        frequency:
          String(i.frequency ?? '').trim().slice(0, 160) || 'As directed',
        durationDays:
          typeof i.durationDays === 'number' && i.durationDays > 0
            ? Math.min(365, Math.floor(i.durationDays))
            : undefined,
        instructionsEn:
          typeof i.instructionsEn === 'string'
            ? i.instructionsEn.slice(0, 240)
            : undefined,
        instructionsAr:
          typeof i.instructionsAr === 'string'
            ? i.instructionsAr.slice(0, 240)
            : undefined,
      })),
  };
}

function stripFences(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return s;
}

// TODO(hardening): address in dedicated cleanup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    const braceStart = s.indexOf('{');
    const braceEnd = s.lastIndexOf('}');
    if (braceStart >= 0 && braceEnd > braceStart) {
      try {
        return JSON.parse(s.slice(braceStart, braceEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
