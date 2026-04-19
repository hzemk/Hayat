-- Drop the unused pricePerMinute column from Doctor
ALTER TABLE "Doctor" DROP COLUMN IF EXISTS "pricePerMinute";
