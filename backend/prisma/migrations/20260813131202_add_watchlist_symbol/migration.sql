-- CreateTable
CREATE TABLE "WatchlistSymbol" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistSymbol_symbol_key" ON "WatchlistSymbol"("symbol");

-- CreateIndex
CREATE INDEX "WatchlistSymbol_createdAt_idx" ON "WatchlistSymbol"("createdAt");
