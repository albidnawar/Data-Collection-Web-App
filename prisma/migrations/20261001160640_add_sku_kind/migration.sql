-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('posm', 'category', 'sku');

-- CreateTable
CREATE TABLE "SkuType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SkuType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkuType_name_key" ON "SkuType"("name");

-- AddForeignKey
ALTER TABLE "SkuType" ADD CONSTRAINT "SkuType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add nullable kind + skuTypeId first
ALTER TABLE "PhotoRecord" ADD COLUMN "kind" "PhotoKind";
ALTER TABLE "PhotoRecord" ADD COLUMN "skuTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_skuTypeId_fkey" FOREIGN KEY ("skuTypeId") REFERENCES "SkuType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill kind from the old isPosm boolean
UPDATE "PhotoRecord" SET "kind" = CASE WHEN "isPosm" THEN 'posm'::"PhotoKind" ELSE 'category'::"PhotoKind" END;

-- Make kind required now that every row has a value
ALTER TABLE "PhotoRecord" ALTER COLUMN "kind" SET NOT NULL;

-- Drop the now-superseded boolean
ALTER TABLE "PhotoRecord" DROP COLUMN "isPosm";

-- CreateIndex
CREATE INDEX "PhotoRecord_kind_idx" ON "PhotoRecord"("kind");
