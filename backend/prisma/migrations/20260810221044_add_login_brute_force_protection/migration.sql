-- AlterTable
ALTER TABLE "SingleOperator" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedLoginWindowStartAt" TIMESTAMP(3),
ADD COLUMN     "lastFailedLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginLockedUntil" TIMESTAMP(3);
