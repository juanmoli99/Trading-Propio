/*
  Warnings:

  - A unique constraint covering the columns `[strategyId,strategyVersion,symbol,action,evaluatedAt]` on the table `StrategySignalRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StrategySignalRecord_strategyId_strategyVersion_symbol_acti_key" ON "StrategySignalRecord"("strategyId", "strategyVersion", "symbol", "action", "evaluatedAt");
