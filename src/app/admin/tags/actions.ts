"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isTagType, type TagType } from "@/lib/tagTypes";
import { getDriveClient } from "@/lib/driveClient";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

async function updateTag(type: TagType, id: string, data: { active?: boolean; name?: string }) {
  switch (type) {
    case "brand":
      return prisma.brand.update({ where: { id }, data });
    case "category":
      return prisma.category.update({ where: { id }, data });
    case "posmType":
      return prisma.posmType.update({ where: { id }, data });
    case "shopType":
      return prisma.shopType.update({ where: { id }, data });
  }
}

export async function toggleTagActiveAction(type: string, id: string, active: boolean) {
  await requireAdmin();
  if (!isTagType(type)) throw new Error("Invalid tag type");
  await updateTag(type, id, { active });
  revalidatePath("/admin/tags");
}

export async function renameTagAction(type: string, id: string, formData: FormData) {
  await requireAdmin();
  if (!isTagType(type)) throw new Error("Invalid tag type");

  const newName = formData.get("name");
  if (typeof newName !== "string" || newName.trim().length === 0) return;
  const trimmed = newName.trim();

  await updateTag(type, id, { name: trimmed });

  if (type === "brand") {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (brand?.driveFolderId) {
      try {
        const drive = getDriveClient();
        await drive.files.update({ fileId: brand.driveFolderId, requestBody: { name: trimmed } });
      } catch {
        // Drive folder rename failed (e.g. folder deleted upstream) — DB rename still stands.
      }
    }
  }

  revalidatePath("/admin/tags");
}
