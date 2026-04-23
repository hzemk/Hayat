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

      const { visible, summary } = extractSummary(result.reply);

      await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: visible,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        },
      });

      const suggestedDoctors = summary
        ? await this.findDoctorsForSpecialty(summary.specialty)
        : undefined;

      return {
        conversationId: conversation.id,
        reply: visible,
        action: summary ? ('READY_FOR_DOCTOR' as const) : ('NONE' as const),
        summary: summary ?? undefined,
        suggestedDoctors,
      };
    } catch (err) {
      this.logger.error(`AI assistant call failed (${provider})`, err as Error);
      const msg = err instanceof Error ? err.message : 'AI assistant unavailable';
      throw new ServiceUnavailableException(msg.slice(0, 300));
    }
  }

  private async callAnthropic(system: string, turns: ChatTurn[]): Promise<ChatResult> {
    const response = await this.anthropic!.messages.create({
      model: this.anthropicModel,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system,
      messages: turns,
    });
    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return {
      reply,
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
    const reply = json.choices?.[0]?.message?.content?.trim() ?? '';
    return {
      reply,
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
