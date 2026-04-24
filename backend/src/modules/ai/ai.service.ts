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
    // Reply in the language the user wrote in, not their profile locale —
    // a user might type English in an Arabic-default app and expect an
    // English answer. If the current message has no script signal (e.g. a
    // bare "5/10"), inherit the conversation's locale from the most recent
    // user message that did have one. Only fall back to the profile locale
    // if the entire conversation has no script signal yet.
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    const profileLocale = (user.preferredLocale === 'en' ? 'en' : 'ar') as
      | 'ar'
      | 'en';
    let locale: 'ar' | 'en' =
      detectMessageLocale(dto.message) ?? profileLocale;
    if (dto.conversationId && !detectMessageLocale(dto.message)) {
      const prior = await this.prisma.aiMessage.findMany({
        where: {
          conversationId: dto.conversationId,
          role: AiMessageRole.USER,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { content: true },
      });
      for (const m of prior) {
        const l = detectMessageLocale(m.content);
        if (l) {
          locale = l;
          break;
        }
      }
    }

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
      // Demo-mode mock when no LLM API key is configured. Lets the symptom
      // chat, doctor handoff, and suggested-doctors UI all work end-to-end
      // without requiring Anthropic/Groq credentials in a demo environment.
      const history = await this.prisma.aiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      });
      const mock = mockChatTurn(history, locale);
      await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: mock.reply,
        },
      });
      const suggestedDoctors = mock.summary
        ? await this.findDoctorsForSpecialty(mock.summary.specialty)
        : undefined;
      return {
        conversationId: conversation.id,
        reply: mock.reply,
        action: mock.summary
          ? ('READY_FOR_DOCTOR' as const)
          : ('NONE' as const),
        summary: mock.summary ?? undefined,
        suggestedDoctors,
      };
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
        description:
          'Structured clinical summary in English, max ~4 sentences. Cover: chief complaint, duration, severity, quality/location, triggers/relievers, associated symptoms, treatments tried.',
        maxLength: 900,
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

interface ExtractedFacts {
  chiefComplaint: string;
  durationText: string | null;
  severity: string | null;
  qualifier: string | null;
  triggers: string | null;
  associatedSymptoms: string | null;
  treatmentsTried: string | null;
  rawTranscript: string;
}

const SPECIALTY_KEYWORDS: { specialty: Specialty; patterns: RegExp[] }[] = [
  {
    specialty: 'Cardiology',
    patterns: [
      /\b(chest pain|chest tight|chest pressure|palpitat\w*|racing heart|heart attack|irregular heart|hypertens\w*|high blood pressure)\b/i,
      /(ألم في الصدر|ضيق في الصدر|خفقان|ضغط الدم|نبض سريع|قلب)/,
    ],
  },
  {
    specialty: 'Pediatrics',
    patterns: [
      /\b(my (son|daughter|child|baby|kid|infant|toddler)|(\d+)[ -]?(year|month|week)s?[ -]old)\b/i,
      /(طفلي|ابني|ابنتي|رضيع|رضيعة|عمره?\s*\d+\s*(شهر|سنة|يوم|أسبوع))/,
    ],
  },
  {
    specialty: 'Dermatology',
    patterns: [
      /\b(rash|acne|pimple|skin|itch|eczema|psoriasis|hives|breakout|dermatitis)\b/i,
      /(طفح|حساسية جلد|بثور|حب الشباب|إكزيما|حكة|جلد)/,
    ],
  },
  {
    specialty: 'OB/GYN',
    patterns: [
      /\b(pregnan|period|menstrual|ovari|vagin|uterine|breast(?!bone)|menopause|contracept)\b/i,
      /(حمل|حامل|دورة شهرية|نسائ|مبيض|رحم)/,
    ],
  },
];

function detectMessageLocale(message: string): 'ar' | 'en' | null {
  const arabic = /[؀-ۿݐ-ݿ]/;
  const latin = /[A-Za-z]/;
  const hasArabic = arabic.test(message);
  const hasLatin = latin.test(message);
  if (hasArabic && !hasLatin) return 'ar';
  if (hasLatin && !hasArabic) return 'en';
  if (hasArabic && hasLatin) {
    // Mixed — pick whichever script has more letters.
    const arCount = (message.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
    const enCount = (message.match(/[A-Za-z]/g) ?? []).length;
    return arCount >= enCount ? 'ar' : 'en';
  }
  return null; // emoji / digits only — caller falls back to profile locale
}

function pickSpecialtyFromTranscript(transcript: string): Specialty {
  const scored = SPECIALTY_KEYWORDS.map(({ specialty, patterns }) => ({
    specialty,
    hits: patterns.reduce(
      (n, r) => n + (transcript.match(new RegExp(r.source, 'gi'))?.length ?? 0),
      0,
    ),
  })).filter((s) => s.hits > 0);
  if (scored.length === 0) return 'Internal Medicine';
  scored.sort((a, b) => b.hits - a.hits);
  return scored[0].specialty;
}

function extractDuration(text: string): string | null {
  // Match symptom durations but EXCLUDE "N year(s) old" which is age, not
  // symptom duration.
  const en = text.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|few|couple of|several)\s+(minute|hour|day|week|month|year)s?(?!\s+old)\b/i,
  );
  if (en) return en[0];
  // Arabic dual forms (ساعتين = 2 hours, يومين = 2 days, etc.) come up
  // constantly in symptom intake and weren't matched by the singular/plural
  // forms below.
  const arDual = text.match(
    /(ساعتين|يومين|أسبوعين|شهرين|سنتين|دقيقتين)/,
  );
  if (arDual) return arDual[0];
  const ar = text.match(
    /(\d+|عدة|بضع|منذ|حوالي)\s*(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر|شهور|سنة|سنوات)/,
  );
  if (ar) return ar[0];
  if (/\b(yesterday|this morning|last night|tonight|today)\b/i.test(text)) {
    return text.match(/\b(yesterday|this morning|last night|tonight|today)\b/i)![0];
  }
  if (/(أمس|البارحة|هذا الصباح|الليلة|اليوم)/.test(text)) {
    return text.match(/(أمس|البارحة|هذا الصباح|الليلة|اليوم)/)![0];
  }
  return null;
}

function extractSeverity(text: string): string | null {
  // Arabic users write "X من 10" instead of "X/10" or "X out of 10".
  const scale = text.match(
    /\b(10|[1-9])\s*\/\s*10\b|\b([1-9]|10)\s*out of\s*10\b|\b(10|[1-9])\s*من\s*10\b/i,
  );
  if (scale) return `${scale[1] ?? scale[2] ?? scale[3]}/10`;
  const numOnly = text.match(/\b(10|[1-9])\b/);
  // Use bare number only when it's plausibly a rating (short reply).
  if (numOnly && text.trim().length <= 5) return `${numOnly[1]}/10`;
  const en = text.match(/\b(mild|moderate|severe|unbearable|excruciating)\b/i);
  if (en) return en[1].toLowerCase();
  const ar = text.match(/(خفيف|متوسط|شديد|لا يحتمل|حاد)/);
  if (ar) return ar[1];
  return null;
}

function extractQualifier(text: string): string | null {
  // Grab associated-symptom / location / trigger phrases when present.
  const trim = text.trim();
  if (trim.length === 0) return null;
  if (trim.length <= 120) return trim;
  return trim.slice(0, 120) + '…';
}

function findUserResponseTo(
  history: { role: AiMessageRole; content: string }[],
  prefixes: readonly string[],
): string | null {
  const idx = history.findIndex(
    (m) =>
      m.role === AiMessageRole.ASSISTANT &&
      prefixes.some((p) => m.content.trimStart().startsWith(p)),
  );
  if (idx === -1) return null;
  const next = history
    .slice(idx + 1)
    .find((m) => m.role === AiMessageRole.USER);
  return next ? extractQualifier(next.content) : null;
}

function extractFacts(
  history: { role: AiMessageRole; content: string }[],
): ExtractedFacts {
  const userMessages = history
    .filter((m) => m.role === AiMessageRole.USER)
    .map((m) => m.content);
  const chiefComplaint = userMessages[0]?.trim() ?? '';
  const transcript = userMessages.join(' · ');

  let durationText: string | null = null;
  let severity: string | null = null;
  for (const msg of userMessages) {
    durationText = durationText ?? extractDuration(msg);
    severity = severity ?? extractSeverity(msg);
  }

  // Each subsequent slot is the user's response to the matching assistant
  // question (matched by known question-prefix templates).
  let qualifier = findUserResponseTo(history, QUALIFIER_PREFIXES);
  const triggers = findUserResponseTo(history, TRIGGER_PREFIXES);
  const associatedSymptoms = findUserResponseTo(history, ASSOCIATED_PREFIXES);
  const treatmentsTried = findUserResponseTo(history, TREATMENT_PREFIXES);

  // If the qualifier slot is still empty and the user has at least one
  // message after the chief complaint, fall back to their last reply so the
  // summary isn't blank.
  if (!qualifier && userMessages.length > 1) {
    qualifier = extractQualifier(userMessages[userMessages.length - 1]);
  }

  return {
    chiefComplaint,
    durationText,
    severity,
    qualifier,
    triggers,
    associatedSymptoms,
    treatmentsTried,
    rawTranscript: transcript,
  };
}

interface MockTurn {
  reply: string;
  summary: ExtractedSummary | null;
}

// Question templates by intake step. Used both to render the question and
// to detect (via prefix match in history) which questions we've already
// asked, so each one fires exactly once.
const QUALIFIER_PREFIXES = [
  'هل يصاحبه',
  'كم عمر الطفل',
  'أين الطفح',
  'متى كانت آخر دورة',
  'أين موقع الألم',
  'Any shortness',
  'How old is the child',
  'Where exactly is the rash',
  'When was your last period',
  'Where exactly do you feel',
];

const TRIGGER_PREFIXES = [
  'ما الذي يزيد الأعراض',
  'What makes the symptoms',
];

const ASSOCIATED_PREFIXES = [
  'هل تشعر بأعراض أخرى',
  'Any other symptoms',
];

const TREATMENT_PREFIXES = [
  'هل أخذت أي دواء',
  'Have you taken anything',
];

function asked(
  history: { role: AiMessageRole; content: string }[],
  prefixes: readonly string[],
): boolean {
  return history.some(
    (m) =>
      m.role === AiMessageRole.ASSISTANT &&
      prefixes.some((p) => m.content.trimStart().startsWith(p)),
  );
}

function triggerQuestion(locale: 'ar' | 'en'): string {
  return locale === 'ar'
    ? 'ما الذي يزيد الأعراض سوءاً أو يخففها (مثلاً الراحة، الطعام، الحركة)؟'
    : 'What makes the symptoms worse or better (rest, food, movement)?';
}

function associatedQuestion(locale: 'ar' | 'en'): string {
  return locale === 'ar'
    ? 'هل تشعر بأعراض أخرى مرتبطة (حرارة، غثيان، دوار، ضيق نفس)؟'
    : 'Any other symptoms with it — fever, nausea, dizziness, shortness of breath?';
}

function treatmentQuestion(locale: 'ar' | 'en'): string {
  return locale === 'ar'
    ? 'هل أخذت أي دواء أو علاج لها حتى الآن، وهل حدث هذا من قبل؟'
    : 'Have you taken anything for it so far, and has this happened before?';
}

function mockChatTurn(
  history: { role: AiMessageRole; content: string }[],
  locale: 'ar' | 'en',
): MockTurn {
  const facts = extractFacts(history);
  const assistantTurns = history.filter(
    (m) => m.role === AiMessageRole.ASSISTANT,
  ).length;

  // 6-step OPQRST-style intake. Cap at 6 assistant questions; after that we
  // always hand off so the conversation doesn't drag.
  const MAX_QUESTIONS = 6;
  if (assistantTurns < MAX_QUESTIONS) {
    if (!facts.durationText) {
      return {
        reply:
          locale === 'ar'
            ? 'منذ متى بدأت هذه الأعراض؟'
            : 'When did the symptoms start?',
        summary: null,
      };
    }
    if (!facts.severity) {
      return {
        reply:
          locale === 'ar'
            ? 'ما شدتها على مقياس من ١ إلى ١٠؟'
            : 'How severe is it on a 1–10 scale?',
        summary: null,
      };
    }
    if (!asked(history, QUALIFIER_PREFIXES)) {
      const specialty = pickSpecialtyFromTranscript(facts.rawTranscript);
      return { reply: qualifierQuestion(specialty, locale), summary: null };
    }
    if (!asked(history, TRIGGER_PREFIXES)) {
      return { reply: triggerQuestion(locale), summary: null };
    }
    if (!asked(history, ASSOCIATED_PREFIXES)) {
      return { reply: associatedQuestion(locale), summary: null };
    }
    if (!asked(history, TREATMENT_PREFIXES)) {
      return { reply: treatmentQuestion(locale), summary: null };
    }
  }

  // Compile summary and hand off.
  const specialty = pickSpecialtyFromTranscript(facts.rawTranscript);
  const summary = buildClinicalSummary(facts, specialty);
  const reply =
    locale === 'ar'
      ? 'شكراً. سأُرسل ملخصاً للطبيب بالأسفل — اختر من تفضل.'
      : 'Thanks. I’ll send the summary to a doctor below — pick who you prefer.';
  return { reply, summary: { text: summary, specialty } };
}

function qualifierQuestion(specialty: Specialty, locale: 'ar' | 'en'): string {
  if (specialty === 'Cardiology') {
    return locale === 'ar'
      ? 'هل يصاحبه ضيق نفس أو ألم منتشر للذراع أو الفك؟'
      : 'Any shortness of breath, or pain spreading to the arm or jaw?';
  }
  if (specialty === 'Pediatrics') {
    return locale === 'ar'
      ? 'كم عمر الطفل، وهل هناك حرارة أو ضعف في الرضاعة/الشرب؟'
      : 'How old is the child, and is there a fever or trouble feeding/drinking?';
  }
  if (specialty === 'Dermatology') {
    return locale === 'ar'
      ? 'أين الطفح بالتحديد، وهل هناك حكة أو ألم؟'
      : 'Where exactly is the rash, and is it itchy or painful?';
  }
  if (specialty === 'OB/GYN') {
    return locale === 'ar'
      ? 'متى كانت آخر دورة، وهل هناك نزيف أو ألم في الحوض؟'
      : 'When was your last period, and is there any bleeding or pelvic pain?';
  }
  // Internal medicine default — broadest useful qualifier.
  return locale === 'ar'
    ? 'أين موقع الألم/الأعراض بالضبط، وما الذي يزيدها أو يخففها؟'
    : 'Where exactly do you feel it, and what makes it better or worse?';
}

function buildClinicalSummary(facts: ExtractedFacts, specialty: Specialty): string {
  const clean = (s: string) => s.replace(/\s+/g, ' ').slice(0, 160);
  const parts: string[] = [];
  if (facts.chiefComplaint) {
    parts.push(`Chief complaint: ${clean(facts.chiefComplaint)}`);
  }
  if (facts.durationText) parts.push(`Duration: ${facts.durationText}`);
  if (facts.severity) parts.push(`Severity: ${facts.severity}`);
  if (facts.qualifier) parts.push(`Quality/location: ${clean(facts.qualifier)}`);
  if (facts.triggers) parts.push(`Triggers/relievers: ${clean(facts.triggers)}`);
  if (facts.associatedSymptoms) {
    parts.push(`Associated: ${clean(facts.associatedSymptoms)}`);
  }
  if (facts.treatmentsTried) {
    parts.push(`Tried so far: ${clean(facts.treatmentsTried)}`);
  }
  parts.push(`Suggested specialty: ${specialty}`);
  return parts.join('. ').slice(0, 900);
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
