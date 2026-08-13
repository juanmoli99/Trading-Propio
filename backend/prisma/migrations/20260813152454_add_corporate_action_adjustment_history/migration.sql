-- CreateTable
CREATE TABLE "CorporateActionAdjustmentHistory" (
    "id" TEXT NOT NULL,
    "corporateActionId" TEXT NOT NULL,
    "corporateActionType" TEXT NOT NULL,
    "symbol" TEXT,
    "processDate" TIMESTAMP(3) NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateActionAdjustmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_corporateActionId_idx" ON "CorporateActionAdjustmentHistory"("corporateActionId");

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_corporateActionType_idx" ON "CorporateActionAdjustmentHistory"("corporateActionType");

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_symbol_idx" ON "CorporateActionAdjustmentHistory"("symbol");

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_processDate_idx" ON "CorporateActionAdjustmentHistory"("processDate");

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_adjustmentType_idx" ON "CorporateActionAdjustmentHistory"("adjustmentType");

-- CreateIndex
CREATE INDEX "CorporateActionAdjustmentHistory_recordedAt_idx" ON "CorporateActionAdjustmentHistory"("recordedAt");
