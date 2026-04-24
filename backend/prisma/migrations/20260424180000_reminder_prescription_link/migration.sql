-- Link a reminder back to the prescription that created it, so the patient
-- can see which doctor prescribed the medication from the reminder detail.

ALTER TABLE "Reminder" ADD COLUMN "prescriptionId" UUID;

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_prescriptionId_fkey"
  FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Reminder_prescriptionId_idx" ON "Reminder"("prescriptionId");
