# Supabase Setup for Hayat

Two ways to bring up the database. Pick one.

## Option A — Run the SQL file in Supabase's SQL Editor (no local config needed)

1. Open your Supabase project dashboard.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `prisma/full_setup.sql` in your editor, copy the entire file contents.
4. Paste into the SQL Editor.
5. Click **Run** (bottom-right, or ⌘/Ctrl+Enter).
6. You should see "Success. No rows returned."
7. Verify: left sidebar → **Table Editor** → you should see `User`, `Doctor`, `DoctorThread`, `DoctorMessage`, `VideoCall`, `Prescription`, `Vaccination`, `Hospital`, `Appointment`, `Reminder`, `FamilyMember`, `MedicalRecord`, and all other tables.

After running it, tell Prisma the migrations are already applied so it won't re-run them:

```bash
# Paste the real DATABASE_URL + DIRECT_URL into .env first
npx prisma migrate resolve --applied 20260417200710_init
npx prisma migrate resolve --applied 20260418000000_family
npx prisma migrate resolve --applied 20260418120000_vaccines
npx prisma migrate resolve --applied 20260418130000_doctors_chat
```

Then seed demo data:
```bash
npm run prisma:seed
```

## Option B — Let Prisma run migrations for you

1. Open `.env` and replace the `DATABASE_URL` + `DIRECT_URL` placeholders with the real Supabase URLs (Dashboard → **Connect** button → **ORMs** → Prisma).
2. From `backend/`:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

## Regenerate the full SQL file at any time

If the schema changes and you want a fresh consolidated SQL:
```bash
cd backend
DATABASE_URL="postgresql://u:p@localhost:5432/d" DIRECT_URL="postgresql://u:p@localhost:5432/d" \
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/full_setup.sql
```
(The dummy URLs are only used for metadata — nothing connects.)
