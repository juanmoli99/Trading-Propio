-- CreateTable
CREATE TABLE "StrategyActivationState" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategyVersion" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyActivationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategyActivationState_strategyId_idx" ON "StrategyActivationState"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyActivationState_strategyVersion_idx" ON "StrategyActivationState"("strategyVersion");

-- CreateIndex
CREATE INDEX "StrategyActivationState_enabled_idx" ON "StrategyActivationState"("enabled");

-- CreateIndex
CREATE INDEX "StrategyActivationState_updatedAt_idx" ON "StrategyActivationState"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyActivationState_strategyId_strategyVersion_key" ON "StrategyActivationState"("strategyId", "strategyVersion");
