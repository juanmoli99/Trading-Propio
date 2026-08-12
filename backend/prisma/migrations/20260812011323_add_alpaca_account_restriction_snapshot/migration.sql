-- CreateEnum
CREATE TYPE "AlpacaMarginClassification" AS ENUM ('LIMITED_MARGIN_1X', 'REG_T_MARGIN_2X', 'INTRADAY_MARGIN_4X');

-- CreateTable
CREATE TABLE "AlpacaAccountRestrictionSnapshot" (
    "id" TEXT NOT NULL,
    "alpacaAccountId" TEXT NOT NULL,
    "accountStatus" TEXT NOT NULL,
    "marginClassification" "AlpacaMarginClassification" NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "tradingBlocked" BOOLEAN NOT NULL,
    "accountBlocked" BOOLEAN NOT NULL,
    "transfersBlocked" BOOLEAN NOT NULL,
    "tradeSuspendedByUser" BOOLEAN NOT NULL,
    "shortingDisabled" BOOLEAN NOT NULL,
    "leverageDisabled" BOOLEAN NOT NULL,
    "tradingAllowed" BOOLEAN NOT NULL,
    "transfersAllowed" BOOLEAN NOT NULL,
    "shortingAllowed" BOOLEAN NOT NULL,
    "leverageAllowed" BOOLEAN NOT NULL,
    "buyingPower" DECIMAL(20,8) NOT NULL,
    "regtBuyingPower" DECIMAL(20,8) NOT NULL,
    "nonMarginableBuyingPower" DECIMAL(20,8) NOT NULL,
    "initialMargin" DECIMAL(20,8) NOT NULL,
    "maintenanceMargin" DECIMAL(20,8) NOT NULL,
    "lastMaintenanceMargin" DECIMAL(20,8) NOT NULL,
    "sma" DECIMAL(20,8) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlpacaAccountRestrictionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlpacaAccountRestrictionSnapshot_alpacaAccountId_key" ON "AlpacaAccountRestrictionSnapshot"("alpacaAccountId");

-- CreateIndex
CREATE INDEX "AlpacaAccountRestrictionSnapshot_accountStatus_idx" ON "AlpacaAccountRestrictionSnapshot"("accountStatus");

-- CreateIndex
CREATE INDEX "AlpacaAccountRestrictionSnapshot_marginClassification_idx" ON "AlpacaAccountRestrictionSnapshot"("marginClassification");

-- CreateIndex
CREATE INDEX "AlpacaAccountRestrictionSnapshot_tradingAllowed_idx" ON "AlpacaAccountRestrictionSnapshot"("tradingAllowed");

-- CreateIndex
CREATE INDEX "AlpacaAccountRestrictionSnapshot_syncedAt_idx" ON "AlpacaAccountRestrictionSnapshot"("syncedAt");
