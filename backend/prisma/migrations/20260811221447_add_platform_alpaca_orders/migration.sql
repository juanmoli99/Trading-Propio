-- CreateTable
CREATE TABLE "PlatformAlpacaOrder" (
    "id" TEXT NOT NULL,
    "alpacaOrderId" TEXT NOT NULL,
    "clientOrderId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAlpacaOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAlpacaOrder_alpacaOrderId_key" ON "PlatformAlpacaOrder"("alpacaOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAlpacaOrder_clientOrderId_key" ON "PlatformAlpacaOrder"("clientOrderId");

-- CreateIndex
CREATE INDEX "PlatformAlpacaOrder_symbol_idx" ON "PlatformAlpacaOrder"("symbol");

-- CreateIndex
CREATE INDEX "PlatformAlpacaOrder_createdAt_idx" ON "PlatformAlpacaOrder"("createdAt");
