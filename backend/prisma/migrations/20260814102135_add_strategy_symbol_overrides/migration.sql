-- CreateTable
CREATE TABLE "StrategySymbolOverrideState" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategyVersion" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySymbolOverrideState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategySymbolOverrideState_strategyId_idx" ON "StrategySymbolOverrideState"("strategyId");

-- CreateIndex
CREATE INDEX "StrategySymbolOverrideState_strategyVersion_idx" ON "StrategySymbolOverrideState"("strategyVersion");

-- CreateIndex
CREATE INDEX "StrategySymbolOverrideState_symbol_idx" ON "StrategySymbolOverrideState"("symbol");

-- CreateIndex
CREATE INDEX "StrategySymbolOverrideState_updatedAt_idx" ON "StrategySymbolOverrideState"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySymbolOverrideState_strategyId_strategyVersion_symb_key" ON "StrategySymbolOverrideState"("strategyId", "strategyVersion", "symbol");
