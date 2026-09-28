"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteDriveFile } from "@/lib/driveFolders";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function deleteAttendanceAction(id: string): Promise<{ error: string | null }> {
  await requireAdmin();

  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) return { error: null };

  const failedLabels: string[] = [];

  for (const [label, driveFileId] of [
    ["clock-in", record.clockInDriveFileId],
    ["clock-out", record.clockOutDriveFileId],
  ] as const) {
    if (!driveFileId) continue;
    try {
      await deleteDriveFile(driveFileId);
    } catch (error) {
      console.error(`deleteAttendanceAction: failed to delete ${label} selfie (fileId=${driveFileId}) for attendance ${id}:`, error);
      failedLabels.push(label);
    }
  }

  await prisma.attendance.delete({ where: { id } });

  revalidatePath("/admin/attendance");

  if (failedLabels.length > 0) {
    return {
      error: `Record deleted, but the ${failedLabels.join(" and ")} selfie couldn't be removed from Drive — check server logs.`,
    };
  }
  return { error: null };
}
