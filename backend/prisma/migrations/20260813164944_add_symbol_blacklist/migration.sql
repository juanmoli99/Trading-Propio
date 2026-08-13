-- CreateTable
CREATE TABLE "SymbolBlacklistEntry" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolBlacklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymbolBlacklistEntry_symbol_key" ON "SymbolBlacklistEntry"("symbol");

-- CreateIndex
CREATE INDEX "SymbolBlacklistEntry_createdAt_idx" ON "SymbolBlacklistEntry"("createdAt");
