-- CreateEnum
CREATE TYPE "PranRelation" AS ENUM ('pran', 'competitor');

-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "pranRelation" "PranRelation";

-- CreateIndex
CREATE INDEX "PhotoRecord_pranRelation_idx" ON "PhotoRecord"("pranRelation");

-- CreateIndex
CREATE INDEX "PhotoRecord_outletName_idx" ON "PhotoRecord"("outletName");
