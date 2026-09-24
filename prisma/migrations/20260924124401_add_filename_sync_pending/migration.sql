-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "filenameSyncPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PhotoRecord_filenameSyncPending_idx" ON "PhotoRecord"("filenameSyncPending");
