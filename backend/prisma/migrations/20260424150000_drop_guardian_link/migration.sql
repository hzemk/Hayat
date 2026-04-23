-- Reverts 20260424120000_add_guardian_link. The guardian feature was
-- rolled back per user request; this migration brings the database back
-- in line with the reverted schema.

-- DropForeignKey
ALTER TABLE "GuardianLink" DROP CONSTRAINT "GuardianLink_guardianUserId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianLink" DROP CONSTRAINT "GuardianLink_patientUserId_fkey";

-- DropTable
DROP TABLE "GuardianLink";
