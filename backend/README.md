# Hayat Backend

NestJS 10 API for the Hayat healthcare platform.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally (or Docker)
- An Anthropic API key (optional for dev — chat falls back to a safe message if unset)

## First-time setup

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT secrets (32+ chars each), ANTHROPIC_API_KEY
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

## Run (dev)

```bash
npm run start:dev
# API listens on http://localhost:4000/api/v1
```

## REST surface

All routes are prefixed with `/api/v1`. Authenticated endpoints require `Authorization: Bearer <accessToken>`.

| Method | Path                           | Auth | Purpose                                      |
| ------ | ------------------------------ | ---- | -------------------------------------------- |
| POST   | /auth/otp/request              | no   | Send OTP to phone                            |
| POST   | /auth/otp/verify               | no   | Verify OTP → returns access + refresh tokens |
| POST   | /auth/refresh                  | no   | Rotate refresh token                         |
| POST   | /auth/logout                   | yes  | Revoke refresh token                         |
| GET    | /users/me                      | yes  | Current user profile                         |
| PATCH  | /users/me                      | yes  | Update profile                               |
| POST   | /ai/chat                       | yes  | Safe-mode medical chat                       |
| GET    | /ai/conversations              | yes  | List AI conversations                        |
| GET    | /ai/conversations/:id          | yes  | Full conversation                            |
| GET    | /hospitals?lat=&lng=&city=     | yes  | List hospitals (sorted by distance if lat/lng)|
| GET    | /hospitals/:id                 | yes  | Hospital detail                              |
| GET    | /hospitals/:id/departments     | yes  | Departments                                  |
| GET    | /appointments                  | yes  | My appointments                              |
| POST   | /appointments                  | yes  | Book                                         |
| DELETE | /appointments/:id              | yes  | Cancel                                       |
| GET    | /prescriptions                 | yes  | My prescriptions (read-only)                 |
| GET    | /prescriptions/:id             | yes  | Prescription detail                          |
| GET    | /medical-record/me             | yes  | My medical record                            |
| POST   | /emergency/request             | yes  | Trigger emergency with GPS                   |
| GET    | /emergency                     | yes  | My past emergency requests                   |

## Safety posture

- OTP codes are `bcrypt`-hashed at rest. Max 5 attempts per code; 60s resend cooldown.
- Refresh tokens are random 96-char hex, SHA-256 hashed in DB, one-time use (rotation on refresh).
- AI chat has a two-layer safety net: (1) regex-based red-flag detector runs **before** the LLM, and (2) a hard system prompt forbidding diagnosis / specific prescriptions. Red-flag hits bypass the model entirely and return a scripted escalation.
- Emergency endpoint logs location + stores it; it does **not** auto-dispatch ambulances (legal/liability boundary). The client is instructed to also call 911.

## Testing with curl

```bash
# 1. Request OTP (check server logs for the code in dev; SMS provider is 'console')
curl -X POST http://localhost:4000/api/v1/auth/otp/request \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"0791234567"}'

# 2. Verify (replace 123456 with the code printed in server logs)
curl -X POST http://localhost:4000/api/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"0791234567","code":"123456"}'

# 3. Use the returned accessToken
ACCESS=... ; curl http://localhost:4000/api/v1/users/me -H "Authorization: Bearer $ACCESS"
```
