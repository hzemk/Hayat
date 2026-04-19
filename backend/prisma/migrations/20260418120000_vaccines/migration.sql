-- CreateTable
CREATE TABLE "Vaccination" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "doseNumber" INTEGER,
    "totalDoses" INTEGER,
    "dateGiven" DATE NOT NULL,
    "expiresAt" DATE,
    "batchNumber" TEXT,
    "administeredBy" TEXT,
    "administeredAt" TEXT,
    "certificateNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vaccination_userId_dateGiven_idx" ON "Vaccination"("userId", "dateGiven");

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
