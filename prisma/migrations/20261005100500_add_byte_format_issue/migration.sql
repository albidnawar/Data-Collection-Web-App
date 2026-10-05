-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "byteFormatIssue" TEXT;

-- CreateIndex
CREATE INDEX "PhotoRecord_byteFormatIssue_idx" ON "PhotoRecord"("byteFormatIssue");

-- One-time reset: records already scanned before this diagnostic field
-- existed have no persisted reason for a failure, so re-check everything
-- once under the new logic (safe to re-run; already-fine files are just
-- re-confirmed, already-fixed files are detected as real JPEG).
UPDATE "PhotoRecord" SET "byteFormatCheckedAt" = NULL;
