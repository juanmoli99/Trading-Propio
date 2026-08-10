-- CreateTable
CREATE TABLE "SystemMetadataRevision" (
    "id" TEXT NOT NULL,
    "systemMetadataId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMetadataRevision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SystemMetadataRevision" ADD CONSTRAINT "SystemMetadataRevision_systemMetadataId_fkey" FOREIGN KEY ("systemMetadataId") REFERENCES "SystemMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
