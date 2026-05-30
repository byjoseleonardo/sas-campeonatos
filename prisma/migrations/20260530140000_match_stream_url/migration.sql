-- AlterTable: link de transmisión en vivo por partido (nullable)
ALTER TABLE "matches" ADD COLUMN "streamUrl" TEXT;
