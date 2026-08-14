-- CreateTable
CREATE TABLE "StrategySignalRecord" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "signalAt" TIMESTAMP(3) NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategyVersion" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "confidence" DECIMAL(10,8) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategySignalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategySignalRecord_signalId_key" ON "StrategySignalRecord"("signalId");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_strategyId_idx" ON "StrategySignalRecord"("strategyId");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_strategyVersion_idx" ON "StrategySignalRecord"("strategyVersion");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_symbol_idx" ON "StrategySignalRecord"("symbol");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_action_idx" ON "StrategySignalRecord"("action");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_signalAt_idx" ON "StrategySignalRecord"("signalAt");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_evaluatedAt_idx" ON "StrategySignalRecord"("evaluatedAt");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_strategyId_symbol_idx" ON "StrategySignalRecord"("strategyId", "symbol");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_strategyId_evaluatedAt_idx" ON "StrategySignalRecord"("strategyId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "StrategySignalRecord_symbol_evaluatedAt_idx" ON "StrategySignalRecord"("symbol", "evaluatedAt");
