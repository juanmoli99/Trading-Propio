-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "SystemMetadata" ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';
