-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockInLat" DOUBLE PRECISION,
    "clockInLng" DOUBLE PRECISION,
    "clockInAddress" TEXT,
    "clockInDriveFileId" TEXT,
    "clockInPhotoUrl" TEXT,
    "clockOutAt" TIMESTAMP(3),
    "clockOutLat" DOUBLE PRECISION,
    "clockOutLng" DOUBLE PRECISION,
    "clockOutAddress" TEXT,
    "clockOutDriveFileId" TEXT,
    "clockOutPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_dateKey_idx" ON "Attendance"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_repId_dateKey_key" ON "Attendance"("repId", "dateKey");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_repId_fkey" FOREIGN KEY ("repId") REFERENCES "Rep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
