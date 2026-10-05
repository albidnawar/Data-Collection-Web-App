-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "byteFormatCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PhotoRecord_byteFormatCheckedAt_idx" ON "PhotoRecord"("byteFormatCheckedAt");
