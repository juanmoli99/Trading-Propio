-- CreateTable
CREATE TABLE "SymbolTemporaryBlock" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolTemporaryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymbolTemporaryBlock_symbol_key" ON "SymbolTemporaryBlock"("symbol");

-- CreateIndex
CREATE INDEX "SymbolTemporaryBlock_expiresAt_idx" ON "SymbolTemporaryBlock"("expiresAt");

-- CreateIndex
CREATE INDEX "SymbolTemporaryBlock_createdAt_idx" ON "SymbolTemporaryBlock"("createdAt");
