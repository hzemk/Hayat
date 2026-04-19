-- CreateEnum
CREATE TYPE "InsuranceCoverageType" AS ENUM ('PUBLIC', 'MILITARY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "InsuranceCoverageScope" AS ENUM ('SELF_ONLY', 'FAMILY');

-- CreateEnum
CREATE TYPE "InsuranceCardSource" AS ENUM ('SANAD', 'HOSPITAL', 'ADMIN');

-- CreateTable
CREATE TABLE "InsuranceCard" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAr" TEXT,
    "memberNumber" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "coverageType" "InsuranceCoverageType" NOT NULL,
    "coverageScope" "InsuranceCoverageScope" NOT NULL DEFAULT 'SELF_ONLY',
    "validFrom" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "photoUrl" TEXT,
    "source" "InsuranceCardSource" NOT NULL DEFAULT 'HOSPITAL',
    "issuedByHospitalId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCard_userId_key" ON "InsuranceCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCard_memberNumber_key" ON "InsuranceCard"("memberNumber");

-- CreateIndex
CREATE INDEX "InsuranceCard_nationalId_idx" ON "InsuranceCard"("nationalId");

-- CreateIndex
CREATE INDEX "InsuranceCard_issuedByHospitalId_idx" ON "InsuranceCard"("issuedByHospitalId");

-- AddForeignKey
ALTER TABLE "InsuranceCard" ADD CONSTRAINT "InsuranceCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCard" ADD CONSTRAINT "InsuranceCard_issuedByHospitalId_fkey" FOREIGN KEY ("issuedByHospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
