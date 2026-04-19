-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "sanadSubject" TEXT,
    "nationalId" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNSPECIFIED',
    "relationship" TEXT NOT NULL DEFAULT 'child',
    "bloodType" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsUrgentCare" BOOLEAN NOT NULL DEFAULT false,
    "urgentCareNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMedication" (
    "id" UUID NOT NULL,
    "familyMemberId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMedication_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN "familyMemberId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_sanadSubject_key" ON "FamilyMember"("sanadSubject");

-- CreateIndex
CREATE INDEX "FamilyMember_guardianId_idx" ON "FamilyMember"("guardianId");

-- CreateIndex
CREATE INDEX "FamilyMedication_familyMemberId_idx" ON "FamilyMedication"("familyMemberId");

-- CreateIndex
CREATE INDEX "Reminder_familyMemberId_scheduledAt_idx" ON "Reminder"("familyMemberId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMedication" ADD CONSTRAINT "FamilyMedication_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
