-- CreateEnum
CREATE TYPE "MarketEventPolicyEventKind" AS ENUM ('EARNINGS', 'CORPORATE_ACTION');

-- CreateEnum
CREATE TYPE "MarketEventPolicyAppliedAction" AS ENUM ('ALLOW', 'BLOCK_ENTRY', 'REDUCE_POSITION_SIZE', 'PROHIBIT_OVERNIGHT');

-- CreateTable
CREATE TABLE "StrategyMarketEventPolicyHistory" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "eventKind" "MarketEventPolicyEventKind" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventSourceId" TEXT,
    "corporateActionType" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "calendarDaysToEvent" INTEGER NOT NULL,
    "matchedRuleId" TEXT,
    "action" "MarketEventPolicyAppliedAction" NOT NULL,
    "positionSizeMultiplier" DECIMAL(10,8) NOT NULL,
    "entryAllowed" BOOLEAN NOT NULL,
    "overnightAllowed" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyMarketEventPolicyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_strategyId_idx" ON "StrategyMarketEventPolicyHistory"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_symbol_idx" ON "StrategyMarketEventPolicyHistory"("symbol");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_eventKind_idx" ON "StrategyMarketEventPolicyHistory"("eventKind");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_eventDate_idx" ON "StrategyMarketEventPolicyHistory"("eventDate");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_evaluatedAt_idx" ON "StrategyMarketEventPolicyHistory"("evaluatedAt");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_action_idx" ON "StrategyMarketEventPolicyHistory"("action");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_matchedRuleId_idx" ON "StrategyMarketEventPolicyHistory"("matchedRuleId");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_strategyId_evaluatedAt_idx" ON "StrategyMarketEventPolicyHistory"("strategyId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "StrategyMarketEventPolicyHistory_symbol_evaluatedAt_idx" ON "StrategyMarketEventPolicyHistory"("symbol", "evaluatedAt");
