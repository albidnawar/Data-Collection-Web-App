-- DropForeignKey
ALTER TABLE "PhotoRecord" DROP CONSTRAINT "PhotoRecord_categoryId_fkey";

-- AlterTable
ALTER TABLE "PhotoRecord" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
