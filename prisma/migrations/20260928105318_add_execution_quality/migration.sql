-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "badExecutionDriveFolderId" TEXT;

-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "isGoodExecution" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "PhotoRecord_isGoodExecution_idx" ON "PhotoRecord"("isGoodExecution");
