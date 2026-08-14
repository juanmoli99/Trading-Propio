-- AlterTable
ALTER TABLE "StrategySignalRecord" ADD COLUMN     "configurationSnapshot" JSONB NOT NULL DEFAULT '{}';
