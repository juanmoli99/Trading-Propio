-- CreateTable
CREATE TABLE "SymbolWhitelistEntry" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolWhitelistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymbolWhitelistEntry_symbol_key" ON "SymbolWhitelistEntry"("symbol");

-- CreateIndex
CREATE INDEX "SymbolWhitelistEntry_createdAt_idx" ON "SymbolWhitelistEntry"("createdAt");
