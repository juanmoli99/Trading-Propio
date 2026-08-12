-- CreateEnum
CREATE TYPE "MarketDataAnomalyType" AS ENUM ('FUTURE_BAR', 'MISSING_BAR_GAP', 'OUTSIDE_SESSION', 'PRICE_SANITY');

-- CreateTable
CREATE TABLE "MarketDataAnomaly" (
    "id" TEXT NOT NULL,
    "type" "MarketDataAnomalyType" NOT NULL,
    "symbol" TEXT,
    "timestamp" TIMESTAMP(3),
    "referenceAt" TIMESTAMP(3),
    "details" JSONB NOT NULL,
    "correlationId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketDataAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketDataAnomaly_type_idx" ON "MarketDataAnomaly"("type");

-- CreateIndex
CREATE INDEX "MarketDataAnomaly_symbol_idx" ON "MarketDataAnomaly"("symbol");

-- CreateIndex
CREATE INDEX "MarketDataAnomaly_timestamp_idx" ON "MarketDataAnomaly"("timestamp");

-- CreateIndex
CREATE INDEX "MarketDataAnomaly_detectedAt_idx" ON "MarketDataAnomaly"("detectedAt");

-- CreateIndex
CREATE INDEX "MarketDataAnomaly_correlationId_idx" ON "MarketDataAnomaly"("correlationId");
