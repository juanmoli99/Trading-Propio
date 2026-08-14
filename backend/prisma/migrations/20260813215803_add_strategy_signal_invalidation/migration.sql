-- AlterTable
ALTER TABLE "StrategySignalRecord" ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "invalidationReason" TEXT;
