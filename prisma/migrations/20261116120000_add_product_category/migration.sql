-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "PhotoRecord" ADD COLUMN "productCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "PhotoRecord_productCategoryId_idx" ON "PhotoRecord"("productCategoryId");

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
