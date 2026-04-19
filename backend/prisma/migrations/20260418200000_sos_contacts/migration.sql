-- CreateTable
CREATE TABLE "SosContact" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "relationship" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SosContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SosContact_userId_priority_idx" ON "SosContact"("userId", "priority");

-- AddForeignKey
ALTER TABLE "SosContact" ADD CONSTRAINT "SosContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
