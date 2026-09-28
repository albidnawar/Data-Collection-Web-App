"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteDriveFile } from "@/lib/driveFolders";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function deleteAttendanceAction(id: string) {
  await requireAdmin();

  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) return;

  for (const driveFileId of [record.clockInDriveFileId, record.clockOutDriveFileId]) {
    if (!driveFileId) continue;
    try {
      await deleteDriveFile(driveFileId);
    } catch {
      // Drive file already gone or inaccessible — still remove the DB record.
    }
  }

  await prisma.attendance.delete({ where: { id } });

  revalidatePath("/admin/attendance");
}
