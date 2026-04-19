-- Restrict Gender enum to MALE | FEMALE only.
-- Existing UNSPECIFIED rows become NULL so the column can stay queryable.

ALTER TABLE "User" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "gender" DROP NOT NULL;
UPDATE "User" SET "gender" = NULL WHERE "gender" = 'UNSPECIFIED';

ALTER TABLE "FamilyMember" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "FamilyMember" ALTER COLUMN "gender" DROP NOT NULL;
UPDATE "FamilyMember" SET "gender" = NULL WHERE "gender" = 'UNSPECIFIED';

ALTER TYPE "Gender" RENAME TO "Gender_old";
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

ALTER TABLE "User"
  ALTER COLUMN "gender" TYPE "Gender"
  USING ("gender"::text::"Gender");

ALTER TABLE "FamilyMember"
  ALTER COLUMN "gender" TYPE "Gender"
  USING ("gender"::text::"Gender");

DROP TYPE "Gender_old";
