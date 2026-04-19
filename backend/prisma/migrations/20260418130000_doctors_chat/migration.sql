-- CreateEnum
CREATE TYPE "DoctorMessageSender" AS ENUM ('PATIENT', 'DOCTOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DoctorMessageKind" AS ENUM ('TEXT', 'SYMPTOM_SUMMARY', 'RX_REQUEST', 'RX_ISSUED', 'VIDEO_INVITE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VideoCallStatus" AS ENUM ('PENDING', 'ONGOING', 'ENDED', 'MISSED');

-- AlterTable User: add defaultDoctorId
ALTER TABLE "User" ADD COLUMN "defaultDoctorId" UUID;

-- AlterTable Doctor: add profile fields
ALTER TABLE "Doctor" ADD COLUMN "specialtyAr" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "bio" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "bioAr" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "yearsExperience" INTEGER;
ALTER TABLE "Doctor" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Doctor" ADD COLUMN "rating" DOUBLE PRECISION;
ALTER TABLE "Doctor" ADD COLUMN "pricePerMinute" INTEGER;
ALTER TABLE "Doctor" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DoctorThread" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "DoctorThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorThread_patientId_doctorId_key" ON "DoctorThread"("patientId", "doctorId");
CREATE INDEX "DoctorThread_patientId_idx" ON "DoctorThread"("patientId");

-- CreateTable
CREATE TABLE "DoctorMessage" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "sender" "DoctorMessageSender" NOT NULL,
    "kind" "DoctorMessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorMessage_threadId_createdAt_idx" ON "DoctorMessage"("threadId", "createdAt");

-- CreateTable
CREATE TABLE "VideoCall" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomUrl" TEXT NOT NULL,
    "createdBy" "DoctorMessageSender" NOT NULL,
    "status" "VideoCallStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCall_roomName_key" ON "VideoCall"("roomName");
CREATE INDEX "VideoCall_threadId_idx" ON "VideoCall"("threadId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultDoctorId_fkey" FOREIGN KEY ("defaultDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorThread" ADD CONSTRAINT "DoctorThread_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorThread" ADD CONSTRAINT "DoctorThread_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMessage" ADD CONSTRAINT "DoctorMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DoctorThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DoctorThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
