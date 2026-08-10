-- CreateTable
CREATE TABLE "PersistentLock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersistentLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersistentLock_key_key" ON "PersistentLock"("key");

-- CreateIndex
CREATE INDEX "PersistentLock_expiresAt_idx" ON "PersistentLock"("expiresAt");

-- CreateIndex
CREATE INDEX "PersistentLock_ownerId_idx" ON "PersistentLock"("ownerId");
