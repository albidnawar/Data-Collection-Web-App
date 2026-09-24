"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteDriveFile } from "@/lib/driveFolders";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function deletePhotoAction(id: string) {
  await requireAdmin();

  const record = await prisma.photoRecord.findUnique({ where: { id } });
  if (!record) return;

  if (record.driveFileId) {
    try {
      await deleteDriveFile(record.driveFileId);
    } catch {
      // Drive file already gone or inaccessible — still remove the DB record.
    }
  }

  await prisma.photoRecord.delete({ where: { id } });

  revalidatePath("/admin/photos");
  revalidatePath("/admin");
}
