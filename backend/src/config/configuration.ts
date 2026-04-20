export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    origin: process.env.APP_ORIGIN ?? '*',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  otp: {
    length: parseInt(process.env.OTP_LENGTH ?? '6', 10),
    ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? '60', 10),
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? 'console',
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID ?? 'HAYAT',
  },
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL ?? 'claude-sonnet-4-6',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1024', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.2'),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    // Llama 4 Scout is Groq's current vision-capable model (free tier).
    model: process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
    // Llama 3.3 70B is Groq's flagship chat model (free tier) — used by AI Assistant.
    chatModel: process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile',
  },
  throttle: {
    default: parseInt(process.env.THROTTLE_DEFAULT ?? '60', 10),
    auth: parseInt(process.env.THROTTLE_AUTH ?? '10', 10),
    emergency: parseInt(process.env.THROTTLE_EMERGENCY ?? '20', 10),
  },
});
