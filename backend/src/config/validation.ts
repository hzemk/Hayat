import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z
    .string()
    .regex(/^\d+d$/, 'JWT_REFRESH_TTL must match /^\\d+d$/ (e.g. "30d")')
    .default('30d'),
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-6'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),
  GROQ_CHAT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  SMS_PROVIDER: z.enum(['console', 'zain', 'orange', 'umniah']).default('console'),
});

export function validateEnv(raw: Record<string, unknown>) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${parsed.error.issues
        .map((i) => ` - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
