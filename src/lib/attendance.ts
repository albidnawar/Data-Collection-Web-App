import { prisma } from "@/lib/db";
import { sanitizeForFilename } from "@/lib/filename";
import { getDhakaDateKey } from "@/lib/attendanceDate";
import { resolveOrCreateAttendanceFolder, uploadPhotoToDrive } from "@/lib/driveFolders";

export interface AttendanceEventInput {
  repId: string;
  repName: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photoBuffer: Buffer;
}

export async function getTodayAttendance(repId: string) {
  const dateKey = getDhakaDateKey();
  return prisma.attendance.findUnique({ where: { repId_dateKey: { repId, dateKey } } });
}

function buildAttendanceFilename(repName: string, dateKey: string, kind: "clockin" | "clockout"): string {
  return `${sanitizeForFilename(repName)}_${dateKey}_${kind}.jpg`;
}

export async function recordClockIn(params: AttendanceEventInput) {
  const dateKey = getDhakaDateKey();

  const existing = await prisma.attendance.findUnique({ where: { repId_dateKey: { repId: params.repId, dateKey } } });
  if (existing) return existing;

  const folderId = await resolveOrCreateAttendanceFolder();
  const filename = buildAttendanceFilename(params.repName, dateKey, "clockin");
  const { fileId, fileUrl } = await uploadPhotoToDrive({ folderId, filename, fileBuffer: params.photoBuffer });

  return prisma.attendance.create({
    data: {
      repId: params.repId,
      dateKey,
      clockInAt: new Date(),
      clockInLat: params.lat,
      clockInLng: params.lng,
      clockInAddress: params.address,
      clockInDriveFileId: fileId,
      clockInPhotoUrl: fileUrl,
    },
  });
}

export async function recordClockOut(params: AttendanceEventInput) {
  const dateKey = getDhakaDateKey();

  const existing = await prisma.attendance.findUnique({ where: { repId_dateKey: { repId: params.repId, dateKey } } });
  if (!existing) {
    throw new Error("You need to start your day before you can end it.");
  }
  if (existing.clockOutAt) return existing;

  const folderId = await resolveOrCreateAttendanceFolder();
  const filename = buildAttendanceFilename(params.repName, dateKey, "clockout");
  const { fileId, fileUrl } = await uploadPhotoToDrive({ folderId, filename, fileBuffer: params.photoBuffer });

  return prisma.attendance.update({
    where: { id: existing.id },
    data: {
      clockOutAt: new Date(),
      clockOutLat: params.lat,
      clockOutLng: params.lng,
      clockOutAddress: params.address,
      clockOutDriveFileId: fileId,
      clockOutPhotoUrl: fileUrl,
    },
  });
}
