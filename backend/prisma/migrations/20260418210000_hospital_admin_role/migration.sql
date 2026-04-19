-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'HOSPITAL_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "hospitalId" UUID;

-- CreateIndex
CREATE INDEX "User_hospitalId_idx" ON "User"("hospitalId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
