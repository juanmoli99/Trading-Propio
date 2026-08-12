-- CreateEnum
CREATE TYPE "MarketDataHaltEventType" AS ENUM ('HALT', 'RESUME');

-- CreateTable
CREATE TABLE "MarketDataHaltEvent" (
    "id" TEXT NOT NULL,
    "type" "MarketDataHaltEventType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "statusCode" TEXT NOT NULL,
    "statusMessage" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonMessage" TEXT NOT NULL,
    "tape" TEXT NOT NULL,
    "feed" TEXT NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketDataHaltEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_type_idx" ON "MarketDataHaltEvent"("type");

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_symbol_idx" ON "MarketDataHaltEvent"("symbol");

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_eventAt_idx" ON "MarketDataHaltEvent"("eventAt");

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_createdAt_idx" ON "MarketDataHaltEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_correlationId_idx" ON "MarketDataHaltEvent"("correlationId");

-- CreateIndex
CREATE INDEX "MarketDataHaltEvent_symbol_eventAt_idx" ON "MarketDataHaltEvent"("symbol", "eventAt");
