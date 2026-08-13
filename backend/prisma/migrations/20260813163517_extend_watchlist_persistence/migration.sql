/*
  Warnings:

  - A unique constraint covering the columns `[tradingSymbolId]` on the table `WatchlistSymbol` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WatchlistSymbol" ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tradingSymbolId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistSymbol_tradingSymbolId_key" ON "WatchlistSymbol"("tradingSymbolId");

-- CreateIndex
CREATE INDEX "WatchlistSymbol_status_idx" ON "WatchlistSymbol"("status");

-- AddForeignKey
ALTER TABLE "WatchlistSymbol" ADD CONSTRAINT "WatchlistSymbol_tradingSymbolId_fkey" FOREIGN KEY ("tradingSymbolId") REFERENCES "TradingSymbol"("id") ON DELETE SET NULL ON UPDATE CASCADE;
