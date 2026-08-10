/*
  Warnings:

  - A unique constraint covering the columns `[systemMetadataId,createdAt]` on the table `SystemMetadataRevision` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SystemMetadataRevision_systemMetadataId_createdAt_key" ON "SystemMetadataRevision"("systemMetadataId", "createdAt");
