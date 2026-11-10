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
  resolveOrCreateOutletsFolder,
} from "@/lib/driveFolders";
import { generateFilename } from "@/lib/filename";
import { isPhotoKind } from "@/lib/tagTypes";

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
  kind: string;
  brandId: string | null;
  shopTypeId: string | null;
  categoryId?: string | null;
  posmTypeId?: string | null;
  skuTypeId?: string | null;
  isGoodExecution: boolean;
  // Left out entirely (not even `null`) by callers that don't edit these —
  // the inline table editor, for instance — so they're kept as-is rather
  // than wiped; the photo-detail panel always sends its current value.
  shelfVacancy?: boolean | null;
  surroundingRemarks?: string | null;
  otherRemarks?: string | null;
}

export interface UpdatePhotoTagsResult {
  ok: boolean;
  message: string;
}

/** Re-tags a single photo (kind, brand, type, shop type, execution quality)
 * and moves its Drive file into the matching brand/execution/Outlets folder
 * right away — the same rename-and-refile Drive helpers the tag-merge "Rerun
 * sync" flow uses, just run for one record immediately instead of waiting for
 * that batch. Kind drives the rest: switching it clears whichever
 * category/POSM/SKU type was picked under the old kind (it doesn't carry
 * over), and "outlet" photos aren't tied to a brand or shop type at all. */
export async function updatePhotoTagsAction(
  id: string,
  input: UpdatePhotoTagsInput,
): Promise<UpdatePhotoTagsResult> {
  await requireAdmin();

  if (!isPhotoKind(input.kind)) return { ok: false, message: "Not a valid photo kind." };
  const kind = input.kind;

  const record = await prisma.photoRecord.findUnique({ where: { id } });
  if (!record) return { ok: false, message: "Photo not found." };

  const categoryId = kind === "category" ? (input.categoryId ?? null) : null;
  const posmTypeId = kind === "posm" ? (input.posmTypeId ?? null) : null;
  const skuTypeId = kind === "sku" ? (input.skuTypeId ?? null) : null;
  const brandId = kind === "outlet" ? null : input.brandId;
  const shopTypeId = kind === "outlet" ? null : input.shopTypeId;
  const isGoodExecution = kind === "outlet" ? record.isGoodExecution : input.isGoodExecution;
  const shelfVacancy = input.shelfVacancy !== undefined ? input.shelfVacancy : record.shelfVacancy;
  const surroundingRemarks = input.surroundingRemarks !== undefined ? input.surroundingRemarks : record.surroundingRemarks;
  const otherRemarks = input.otherRemarks !== undefined ? input.otherRemarks : record.otherRemarks;

  let brand = null;
  let shopType = null;
  if (kind !== "outlet") {
    if (!brandId || !shopTypeId) return { ok: false, message: "Choose a valid brand and shop type." };
    [brand, shopType] = await Promise.all([
      prisma.brand.findUnique({ where: { id: brandId } }),
      prisma.shopType.findUnique({ where: { id: shopTypeId } }),
    ]);
    if (!brand || !shopType) return { ok: false, message: "Choose a valid brand and shop type." };
  }

  const [category, posmType, skuType] = await Promise.all([
    categoryId ? prisma.category.findUnique({ where: { id: categoryId } }) : null,
    posmTypeId ? prisma.posmType.findUnique({ where: { id: posmTypeId } }) : null,
    skuTypeId ? prisma.skuType.findUnique({ where: { id: skuTypeId } }) : null,
  ]);

  const typeName = kind === "posm" ? posmType?.name : kind === "category" ? category?.name : kind === "sku" ? skuType?.name : undefined;
  const filename = generateFilename(
    { brand: brand?.name ?? null, kind, typeName: typeName ?? "", shopType: shopType?.name ?? null },
    record.capturedAt,
  );

  await prisma.photoRecord.update({
    where: { id },
    data: {
      kind,
      brandId,
      shopTypeId,
      categoryId,
      posmTypeId,
      skuTypeId,
      isGoodExecution,
      shelfVacancy,
      surroundingRemarks,
      otherRemarks,
      filename,
      filenameSyncPending: true,
    },
  });

  if (record.driveFileId) {
    try {
      const targetFolderId =
        kind === "outlet"
          ? await resolveOrCreateOutletsFolder()
          : brandId
            ? isGoodExecution
              ? await resolveOrCreateBrandFolder(brandId, brand!.name)
              : await resolveOrCreateBadExecutionBrandFolder(brandId, brand!.name)
            : null;

      if (targetFolderId) {
        const { removedParentIds } = await renameAndRefileDriveFile({
          fileId: record.driveFileId,
          newName: filename,
          targetFolderId,
        });
        await prisma.photoRecord.update({ where: { id }, data: { filenameSyncPending: false } });
        for (const oldFolderId of removedParentIds) {
          await deleteDriveFolderIfEmpty(oldFolderId);
        }
      }
    } catch {
      // Drive hiccup — the record stays filenameSyncPending so the "Rerun
      // filename sync" button on /admin/tags will retry it.
    }
  }

  if (record.brandId && (record.brandId !== brandId || record.isGoodExecution !== isGoodExecution)) {
    await cleanupEmptyBrandFolder(record.brandId);
  }

  revalidatePath("/admin/photos");
  revalidatePath("/admin/pran");
  revalidatePath("/admin/tags");
  revalidatePath("/admin");

  return { ok: true, message: "Updated." };
}
