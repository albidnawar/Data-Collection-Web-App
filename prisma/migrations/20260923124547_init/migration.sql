-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('pending', 'uploading', 'uploaded', 'failed');

-- CreateTable
CREATE TABLE "Rep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosmType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "PosmType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ShopType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoRecord" (
    "id" TEXT NOT NULL,
    "clientQueueId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "isPosm" BOOLEAN NOT NULL,
    "categoryId" TEXT NOT NULL,
    "posmTypeId" TEXT,
    "shopTypeId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "address" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "filename" TEXT NOT NULL,
    "driveFileId" TEXT,
    "driveFileUrl" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rep_username_key" ON "Rep"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PosmType_name_key" ON "PosmType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShopType_name_key" ON "ShopType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoRecord_clientQueueId_key" ON "PhotoRecord"("clientQueueId");

-- CreateIndex
CREATE INDEX "PhotoRecord_brandId_idx" ON "PhotoRecord"("brandId");

-- CreateIndex
CREATE INDEX "PhotoRecord_repId_idx" ON "PhotoRecord"("repId");

-- CreateIndex
CREATE INDEX "PhotoRecord_status_idx" ON "PhotoRecord"("status");

-- CreateIndex
CREATE INDEX "PhotoRecord_capturedAt_idx" ON "PhotoRecord"("capturedAt");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosmType" ADD CONSTRAINT "PosmType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopType" ADD CONSTRAINT "ShopType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Rep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_repId_fkey" FOREIGN KEY ("repId") REFERENCES "Rep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_posmTypeId_fkey" FOREIGN KEY ("posmTypeId") REFERENCES "PosmType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRecord" ADD CONSTRAINT "PhotoRecord_shopTypeId_fkey" FOREIGN KEY ("shopTypeId") REFERENCES "ShopType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
