# Hayat — Smart Digital Healthcare Platform

MVP monorepo for Hayat, a patient-facing digital healthcare platform for Jordan.

## Structure

```
hayat/
├── backend/   NestJS + Prisma + PostgreSQL API
├── mobile/    Expo (React Native) + TypeScript app
└── README.md
```

## Stack

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Mobile   | Expo SDK 52+, React Native, TypeScript, Expo Router          |
| State    | Zustand (UI) + TanStack Query (server)                       |
| Backend  | NestJS 10, TypeScript, Prisma, PostgreSQL 16                 |
| Auth     | Phone OTP → JWT access (15m) + rotating refresh token (30d)  |
| AI       | Claude API (`claude-sonnet-4-6`) behind a guardrailed gateway |
| i18n     | `i18next`, Arabic-first with English                         |

## Quick start

You need **Node 20+**, **PostgreSQL 15+**, and (optionally) an **Anthropic API key**.

### 1. Start Postgres

Use whatever you prefer. The fastest path is Docker:

```bash
docker run --name hayat-pg \
  -e POSTGRES_USER=hayat -e POSTGRES_PASSWORD=hayat -e POSTGRES_DB=hayat \
  -p 5432:5432 -d postgres:16
```

Or use a local `brew install postgresql@16` install and create the database manually:

```bash
createuser hayat --pwprompt       # password: hayat
createdb hayat -O hayat
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to long random strings,
# and ANTHROPIC_API_KEY if you want the AI chat to actually call Claude.
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
# → http://localhost:4000/api/v1
```

The SMS provider defaults to `console`, so OTP codes are printed to the backend log instead of sent via SMS. This is what you use in dev.

### 3. Mobile

In a second terminal:

```bash
cd mobile
cp .env.example .env
# If you're on an Android emulator or a physical device, update EXPO_PUBLIC_API_BASE_URL.
# See mobile/README.md for the mapping.
npm install
npm run ios        # or: npm run android / npm run web
```

### 4. Log in

1. Enter a Jordanian phone number (e.g. `0791234567`).
2. Copy the 6-digit OTP from the backend console log.
3. Paste on the verify screen.
4. You're in.

See [`backend/README.md`](backend/README.md) and [`mobile/README.md`](mobile/README.md) for detailed docs.

## MVP scope

Auth (phone OTP), profile, AI chat (safe mode), hospital booking, emergency button, read-only prescriptions and medical record.

## Safety posture

- OTP codes `bcrypt`-hashed at rest; 5 attempts max; 60s resend cooldown.
- Refresh tokens SHA-256 hashed in DB; rotated on every refresh.
- AI chat has a regex red-flag detector that bypasses the LLM entirely for critical symptoms (chest pain, stroke, suicidality, anaphylaxis, etc.) and returns a scripted emergency escalation.
- AI system prompt forbids diagnosis and specific prescription recommendations.
- Emergency endpoint logs GPS + notifies nearest hospital but does **not** auto-dispatch ambulances — the UI tells the user to also call 911.

## Compliance targets (not yet implemented)

- Jordan PDPL 2023 (Personal Data Protection Law)
- MoH / Hakeem EHR interoperability
- JFDA for any future e-prescribing
