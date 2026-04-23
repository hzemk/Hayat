-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "familyMemberId" UUID;

-- CreateIndex
CREATE INDEX "Appointment_familyMemberId_idx" ON "Appointment"("familyMemberId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
