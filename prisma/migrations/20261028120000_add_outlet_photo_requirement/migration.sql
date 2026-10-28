-- AlterEnum
ALTER TYPE "PhotoKind" ADD VALUE 'outlet';

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "requiresOutletPhoto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "outletName" TEXT;
