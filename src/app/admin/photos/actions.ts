"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  cleanupEmptyBrandFolder,
  deleteDriveFile,
  deleteDriveFolderIfEmpty,
  renameAndRefileDriveFile,
  resolveOrCreateBadExecutionBrandFolder,
  resolveOrCreateBrandFolder,
} from "@/lib/driveFolders";
import { generateFilename } from "@/lib/filename";

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
  if (record.brandId) await cleanupEmptyBrandFolder(record.brandId);

  revalidatePath("/admin/photos");
  revalidatePath("/admin/pran");
  revalidatePath("/admin");
}

export interface UpdatePhotoTagsInput {
  brandId: string;
  shopTypeId: string;
  categoryId?: string | null;
  posmTypeId?: string | null;
  skuTypeId?: string | null;
  isGoodExecution: boolean;
}

export interface UpdatePhotoTagsResult {
  ok: boolean;
  message: string;
}

/** Re-tags a single photo (brand, type, shop type, execution quality) and moves
 * its Drive file into the matching brand/execution folder right away — the
 * same rename-and-refile Drive helpers the tag-merge "Rerun sync" flow uses,
 * just run for one record immediately instead of waiting for that batch. */
export async function updatePhotoTagsAction(
  id: string,
  input: UpdatePhotoTagsInput,
): Promise<UpdatePhotoTagsResult> {
  await requireAdmin();

  const record = await prisma.photoRecord.findUnique({ where: { id } });
  if (!record) return { ok: false, message: "Photo not found." };

  const categoryId = record.kind === "category" ? (input.categoryId ?? null) : record.categoryId;
  const posmTypeId = record.kind === "posm" ? (input.posmTypeId ?? null) : record.posmTypeId;
  const skuTypeId = record.kind === "sku" ? (input.skuTypeId ?? null) : record.skuTypeId;

  const [brand, shopType, category, posmType, skuType] = await Promise.all([
    prisma.brand.findUnique({ where: { id: input.brandId } }),
    prisma.shopType.findUnique({ where: { id: input.shopTypeId } }),
    categoryId ? prisma.category.findUnique({ where: { id: categoryId } }) : null,
    posmTypeId ? prisma.posmType.findUnique({ where: { id: posmTypeId } }) : null,
    skuTypeId ? prisma.skuType.findUnique({ where: { id: skuTypeId } }) : null,
  ]);
  if (!brand || !shopType) return { ok: false, message: "Choose a valid brand and shop type." };

  const typeName = record.kind === "posm" ? posmType?.name : record.kind === "category" ? category?.name : skuType?.name;
  const filename = generateFilename(
    { brand: brand.name, kind: record.kind, typeName: typeName ?? "", shopType: shopType.name },
    record.capturedAt,
  );

  await prisma.photoRecord.update({
    where: { id },
    data: {
      brandId: input.brandId,
      shopTypeId: input.shopTypeId,
      categoryId,
      posmTypeId,
      skuTypeId,
      isGoodExecution: input.isGoodExecution,
      filename,
      filenameSyncPending: true,
    },
  });

  if (record.driveFileId) {
    try {
      const targetFolderId = input.isGoodExecution
        ? await resolveOrCreateBrandFolder(input.brandId, brand.name)
        : await resolveOrCreateBadExecutionBrandFolder(input.brandId, brand.name);
      const { removedParentIds } = await renameAndRefileDriveFile({
        fileId: record.driveFileId,
        newName: filename,
        targetFolderId,
      });
      await prisma.photoRecord.update({ where: { id }, data: { filenameSyncPending: false } });
      for (const oldFolderId of removedParentIds) {
        await deleteDriveFolderIfEmpty(oldFolderId);
      }
    } catch {
      // Drive hiccup — the record stays filenameSyncPending so the "Rerun
      // filename sync" button on /admin/tags will retry it.
    }
  }

  if (record.brandId && (record.brandId !== input.brandId || record.isGoodExecution !== input.isGoodExecution)) {
    await cleanupEmptyBrandFolder(record.brandId);
  }

  revalidatePath("/admin/photos");
  revalidatePath("/admin/tags");
  revalidatePath("/admin");

  return { ok: true, message: "Updated." };
}
