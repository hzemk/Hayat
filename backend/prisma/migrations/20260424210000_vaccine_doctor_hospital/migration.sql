-- Structured provenance for a vaccination: which doctor administered it at
-- which hospital. Both are optional — legacy Sanad-imported vaccines only
-- have the free-form administeredBy/administeredAt strings.

ALTER TABLE "Vaccination"
  ADD COLUMN "administeredByDoctorId" UUID,
  ADD COLUMN "administeredAtHospitalId" UUID;

ALTER TABLE "Vaccination"
  ADD CONSTRAINT "Vaccination_administeredByDoctorId_fkey"
  FOREIGN KEY ("administeredByDoctorId") REFERENCES "Doctor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Vaccination"
  ADD CONSTRAINT "Vaccination_administeredAtHospitalId_fkey"
  FOREIGN KEY ("administeredAtHospitalId") REFERENCES "Hospital"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Vaccination_administeredByDoctorId_idx"
  ON "Vaccination"("administeredByDoctorId");
CREATE INDEX "Vaccination_administeredAtHospitalId_idx"
  ON "Vaccination"("administeredAtHospitalId");
