"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isTagType, type TagType } from "@/lib/tagTypes";
import { getDriveClient } from "@/lib/driveClient";
import { countPhotosUsingTag, mergeAndDeleteTag } from "@/lib/tagMerge";
import { runFilenameSyncBatch } from "@/lib/filenameSync";

async function requireAdminId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
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

async function createTag(type: TagType, name: string, createdById: string) {
  const create = { name, createdById };
  switch (type) {
    case "brand":
      return prisma.brand.create({ data: create });
    case "category":
      return prisma.category.create({ data: create });
    case "posmType":
      return prisma.posmType.create({ data: create });
    case "shopType":
      return prisma.shopType.create({ data: create });
  }
}

export async function addTagAction(type: string, _prevState: string | undefined, formData: FormData) {
  const adminId = await requireAdminId();
  if (!isTagType(type)) return "Invalid tag type";

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) return "Name is required";

  try {
    await createTag(type, name.trim(), adminId);
  } catch {
    return "That name already exists";
  }

  revalidatePath("/admin/tags");
  return undefined;
}

export async function toggleTagActiveAction(type: string, id: string, active: boolean) {
  await requireAdminId();
  if (!isTagType(type)) throw new Error("Invalid tag type");
  await updateTag(type, id, { active });
  revalidatePath("/admin/tags");
}

export async function renameTagAction(type: string, id: string, formData: FormData) {
  await requireAdminId();
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

export async function countPhotosForTagAction(type: string, id: string): Promise<number> {
  await requireAdminId();
  if (!isTagType(type)) throw new Error("Invalid tag type");
  return countPhotosUsingTag(type, id);
}

export async function deleteTagAction(type: string, id: string, mergeIntoId: string | null) {
  await requireAdminId();
  if (!isTagType(type)) throw new Error("Invalid tag type");

  await mergeAndDeleteTag(type, id, mergeIntoId);

  revalidatePath("/admin/tags");
  revalidatePath("/admin/photos");
  revalidatePath("/admin");
}

export async function rerunFilenameSyncAction() {
  await requireAdminId();
  const result = await runFilenameSyncBatch();
  revalidatePath("/admin/tags");
  revalidatePath("/admin/photos");
  return result;
}
