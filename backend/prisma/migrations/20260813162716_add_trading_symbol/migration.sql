-- CreateTable
CREATE TABLE "TradingSymbol" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "alpacaAssetId" TEXT,
    "assetClass" TEXT,
    "exchange" TEXT,
    "name" TEXT,
    "alpacaStatus" TEXT,
    "tradable" BOOLEAN,
    "fractionable" BOOLEAN,
    "shortable" BOOLEAN,
    "easyToBorrow" BOOLEAN,
    "lastValidatedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingSymbol_symbol_key" ON "TradingSymbol"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "TradingSymbol_alpacaAssetId_key" ON "TradingSymbol"("alpacaAssetId");

-- CreateIndex
CREATE INDEX "TradingSymbol_status_idx" ON "TradingSymbol"("status");

-- CreateIndex
CREATE INDEX "TradingSymbol_assetClass_idx" ON "TradingSymbol"("assetClass");

-- CreateIndex
CREATE INDEX "TradingSymbol_exchange_idx" ON "TradingSymbol"("exchange");

-- CreateIndex
CREATE INDEX "TradingSymbol_alpacaStatus_idx" ON "TradingSymbol"("alpacaStatus");

-- CreateIndex
CREATE INDEX "TradingSymbol_tradable_idx" ON "TradingSymbol"("tradable");

-- CreateIndex
CREATE INDEX "TradingSymbol_lastValidatedAt_idx" ON "TradingSymbol"("lastValidatedAt");

-- CreateIndex
CREATE INDEX "TradingSymbol_createdAt_idx" ON "TradingSymbol"("createdAt");
