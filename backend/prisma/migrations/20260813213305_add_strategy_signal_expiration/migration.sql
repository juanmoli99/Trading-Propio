/*
  Warnings:

  - Added the required column `expiresAt` to the `StrategySignalRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StrategySignalRecord" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "StrategySignalRecord_expiresAt_idx" ON "StrategySignalRecord"("expiresAt");
