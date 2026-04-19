-- Drop the VideoCall model (table was created alongside the doctor chat feature).
DROP TABLE IF EXISTS "VideoCall";
DROP TYPE IF EXISTS "VideoCallStatus";

-- Convert any existing VIDEO_INVITE messages to SYSTEM so they still render
-- cleanly in the chat history after the enum value is removed.
UPDATE "DoctorMessage" SET "kind" = 'SYSTEM'::"DoctorMessageKind" WHERE "kind" = 'VIDEO_INVITE';

-- Postgres cannot drop a value from an enum in place; recreate the type.
ALTER TYPE "DoctorMessageKind" RENAME TO "DoctorMessageKind_old";
CREATE TYPE "DoctorMessageKind" AS ENUM ('TEXT', 'SYMPTOM_SUMMARY', 'RX_REQUEST', 'RX_ISSUED', 'SYSTEM');
ALTER TABLE "DoctorMessage"
  ALTER COLUMN "kind" DROP DEFAULT,
  ALTER COLUMN "kind" TYPE "DoctorMessageKind" USING ("kind"::text::"DoctorMessageKind"),
  ALTER COLUMN "kind" SET DEFAULT 'TEXT';
DROP TYPE "DoctorMessageKind_old";
