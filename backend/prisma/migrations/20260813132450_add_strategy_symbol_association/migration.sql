-- CreateTable
CREATE TABLE "StrategySymbolAssociation" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySymbolAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategySymbolAssociation_strategyId_idx" ON "StrategySymbolAssociation"("strategyId");

-- CreateIndex
CREATE INDEX "StrategySymbolAssociation_symbol_idx" ON "StrategySymbolAssociation"("symbol");

-- CreateIndex
CREATE INDEX "StrategySymbolAssociation_createdAt_idx" ON "StrategySymbolAssociation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySymbolAssociation_strategyId_symbol_key" ON "StrategySymbolAssociation"("strategyId", "symbol");
