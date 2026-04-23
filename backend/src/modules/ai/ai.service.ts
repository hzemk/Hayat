import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiMessageRole } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { AuditService } from '@common/audit/audit.service';
import { ChatDto } from './dto/chat.dto';
import { detectRedFlag } from './safety/red-flags';
import { buildSystemPrompt } from './safety/system-prompt';

type ChatProvider = 'groq' | 'anthropic';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  reply: string;
  summary?: ExtractedSummary | null;
  tokensIn?: number;
  tokensOut?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic | null;
  private readonly anthropicModel: string;
  private readonly groqApiKey: string | undefined;
  private readonly groqChatModel: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    const anthropicKey = this.config.get<string>('ai.apiKey');
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
    this.anthropicModel = this.config.get<string>('ai.model') ?? 'claude-sonnet-4-6';
    this.groqApiKey = this.config.get<string>('groq.apiKey');
    this.groqChatModel =
      this.config.get<string>('groq.chatModel') ?? 'llama-3.3-70b-versatile';
    this.maxTokens = this.config.get<number>('ai.maxTokens') ?? 1024;
    this.temperature = this.config.get<number>('ai.temperature') ?? 0.2;
  }

  private pickProvider(): ChatProvider | null {
    if (this.groqApiKey) return 'groq';
    if (this.anthropic) return 'anthropic';
    return null;
  }

  async chat(userId: string, dto: ChatDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    const locale = (user.preferredLocale === 'en' ? 'en' : 'ar') as 'ar' | 'en';

    const conversation = dto.conversationId
      ? await this.ensureOwned(userId, dto.conversationId)
      : await this.prisma.aiConversation.create({ data: { userId } });

    await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.USER,
        content: dto.message,
      },
    });

    const redFlag = detectRedFlag(dto.message);
    if (redFlag) {
      const advice = redFlag.advice[locale];
      await this.prisma.$transaction([
        this.prisma.aiMessage.create({
          data: {
            conversationId: conversation.id,
            role: AiMessageRole.ASSISTANT,
            content: advice,
            redFlag: true,
          },
        }),
        this.prisma.aiConversation.update({
          where: { id: conversation.id },
          data: { escalated: true, updatedAt: new Date() },
        }),
      ]);
      void this.audit.record({
        userId,
        action: 'ai.conversation.escalate',
        resource: 'AiConversation',
        resourceId: conversation.id,
        metadata: { category: redFlag.category, locale },
      });
      return {
        conversationId: conversation.id,
        reply: advice,
        action: 'CALL_EMERGENCY' as const,
        category: redFlag.category,
      };
    }

    const provider = this.pickProvider();
    if (!provider) {
      this.logger.warn('No AI provider configured; returning safe fallback.');
      const fallback =
        locale === 'ar'
          ? 'الخدمة غير متاحة حالياً. يمكنك حجز موعد مع طبيب من القائمة الرئيسية.'
          : 'The assistant is temporarily unavailable. You can book an appointment from the home screen.';
      await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: fallback,
        },
      });
      return { conversationId: conversation.id, reply: fallback, action: 'NONE' as const };
    }

    const recent = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const history = recent.reverse();
    const turns: ChatTurn[] = history.map((m) => ({
      role: m.role === AiMessageRole.ASSISTANT ? 'assistant' : 'user',
      content: m.content,
    }));
    const system = buildSystemPrompt(locale);

    try {
      const result =
        provider === 'groq'
          ? await this.callGroq(system, turns)
          : await this.callAnthropic(system, turns);

      const summary = result.summary ?? null;

      await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: result.reply,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        },
      });

      const suggestedDoctors = summary
        ? await this.findDoctorsForSpecialty(summary.specialty)
        : undefined;

      return {
        conversationId: conversation.id,
        reply: result.reply,
        action: summary ? ('READY_FOR_DOCTOR' as const) : ('NONE' as const),
        summary: summary ?? undefined,
        suggestedDoctors,
      };
    } catch (err) {
      this.logger.error(`AI assistant call failed (${provider})`, err as Error);
      throw new ServiceUnavailableException('AI assistant unavailable');
    }
  }

  private async callAnthropic(system: string, turns: ChatTurn[]): Promise<ChatResult> {
    const response = await this.anthropic!.messages.create({
      model: this.anthropicModel,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system,
      tools: [HANDOFF_TOOL],
      messages: turns,
    });
    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    // Structured handoff comes from the tool call, not a regex in the text.
    let summary: ExtractedSummary | null = null;
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === 'tool_use' && b.name === 'handoff_to_doctor',
    );
    if (toolUse) {
      const input = toolUse.input as { text?: unknown; specialty?: unknown };
      const text =
        typeof input.text === 'string' ? input.text.trim().slice(0, 600) : '';
      const specialtyRaw =
        typeof input.specialty === 'string' ? input.specialty.trim() : '';
      const specialty: Specialty = (ALLOWED_SPECIALTIES as readonly string[]).includes(
        specialtyRaw,
      )
        ? (specialtyRaw as Specialty)
        : 'Internal Medicine';
      if (text) summary = { text, specialty };
    }

    return {
      reply,
      summary,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  private async callGroq(system: string, turns: ChatTurn[]): Promise<ChatResult> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.groqApiKey}`,
      },
      body: JSON.stringify({
        model: this.groqChatModel,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [{ role: 'system', content: system }, ...turns],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
    // TODO(hardening): wire Groq tool_calls. The OpenAI-compat tools API on
    // Groq needs a second round-trip to pass tool_result back; keeping the
    // regex marker here until we implement it. Anthropic path uses the tool.
    const { visible, summary } = extractSummary(raw);
    return {
      reply: visible,
      summary,
      tokensIn: json.usage?.prompt_tokens,
      tokensOut: json.usage?.completion_tokens,
    };
  }

  async listConversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        escalated: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const convo = await this.ensureOwned(userId, conversationId);
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, redFlag: true, createdAt: true },
    });
    return { ...convo, messages };
  }

  private async findDoctorsForSpecialty(specialty: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { specialty },
      orderBy: [{ rating: 'desc' }, { yearsExperience: 'desc' }],
      take: 3,
      include: {
        user: { select: { fullName: true } },
        hospital: { select: { nameAr: true, nameEn: true } },
      },
    });
    return doctors.map((d) => ({
      id: d.id,
      fullName: d.user.fullName,
      specialty: d.specialty,
      specialtyAr: d.specialtyAr ?? undefined,
      rating: d.rating ?? undefined,
      yearsExperience: d.yearsExperience ?? undefined,
      hospitalNameEn: d.hospital?.nameEn ?? undefined,
      hospitalNameAr: d.hospital?.nameAr ?? undefined,
    }));
  }

  private async ensureOwned(userId: string, conversationId: string) {
    const convo = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.userId !== userId) throw new ForbiddenException();
    return convo;
  }
}

const ALLOWED_SPECIALTIES = [
  'Internal Medicine',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'OB/GYN',
] as const;

// Anthropic tool definition: model calls this when intake is complete.
// Replaces the previous <<<HAYAT_SUMMARY {...}>>> regex marker on the
// Anthropic path. Groq still uses the regex — see flag in callGroq.
const HANDOFF_TOOL: Anthropic.Tool = {
  name: 'handoff_to_doctor',
  description:
    'Call when the intake (chief complaint, duration, severity, key qualifier) is complete and the patient is ready for doctor review. Provide a short English clinical summary and the appropriate specialty.',
  input_schema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string',
        description: 'Short clinical summary in English, max ~2 sentences.',
        maxLength: 600,
      },
      specialty: {
        type: 'string',
        enum: [...ALLOWED_SPECIALTIES],
        description: 'Triage specialty for the suggested doctor.',
      },
    },
    required: ['text', 'specialty'],
  },
};

type Specialty = (typeof ALLOWED_SPECIALTIES)[number];

export interface ExtractedSummary {
  text: string;
  specialty: Specialty;
}

function extractSummary(raw: string): {
  visible: string;
  summary: ExtractedSummary | null;
} {
  const match = raw.match(/<<<HAYAT_SUMMARY\s+(\{[\s\S]*?\})\s*>>>/);
  if (!match) return { visible: raw.trim(), summary: null };

  const visible = raw.replace(match[0], '').trim();
  try {
    const parsed = JSON.parse(match[1]) as { text?: unknown; specialty?: unknown };
    const text =
      typeof parsed.text === 'string' && parsed.text.trim().length > 0
        ? parsed.text.trim().slice(0, 600)
        : visible.slice(0, 600);
    const specialtyRaw =
      typeof parsed.specialty === 'string' ? parsed.specialty.trim() : '';
    const specialty: Specialty = (ALLOWED_SPECIALTIES as readonly string[]).includes(
      specialtyRaw,
    )
      ? (specialtyRaw as Specialty)
      : 'Internal Medicine';
    return { visible, summary: { text, specialty } };
  } catch {
    return { visible, summary: null };
  }
}
