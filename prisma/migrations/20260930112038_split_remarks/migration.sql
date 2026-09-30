-- AlterTable
ALTER TABLE "PhotoRecord" RENAME COLUMN "remarks" TO "surroundingRemarks";
ALTER TABLE "PhotoRecord" ADD COLUMN "otherRemarks" TEXT;
