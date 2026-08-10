-- CreateTable
CREATE TABLE "FinancialConstraintProbe" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialConstraintProbe_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinancialConstraintProbe"
ADD CONSTRAINT "FinancialConstraintProbe_amount_non_negative"
CHECK ("amount" >= 0);
