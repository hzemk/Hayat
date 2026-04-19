-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReminderSource" AS ENUM ('MANUAL', 'PRESCRIPTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "Reminder"
  ADD COLUMN IF NOT EXISTS "source" "ReminderSource" NOT NULL DEFAULT 'MANUAL';
