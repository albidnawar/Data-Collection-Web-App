import { prisma } from "@/lib/db";
import { generateFilename } from "@/lib/filename";
import { cleanupEmptyBrandFolder, deleteDriveFile, deleteDriveFolderIfEmpty } from "@/lib/driveFolders";
import type { TagType } from "@/lib/tagTypes";
import type { Prisma } from "@/generated/prisma/client";

function whereForType(type: TagType, id: string): Prisma.PhotoRecordWhereInput {
  switch (type) {
    case "brand":
      return { brandId: id };
    case "category":
      return { categoryId: id };
    case "posmType":
      return { posmTypeId: id };
    case "skuType":
      return { skuTypeId: id };
    case "shopType":
      return { shopTypeId: id };
  }
}

function updateDataForType(type: TagType, id: string): Prisma.PhotoRecordUpdateInput {
  switch (type) {
    case "brand":
      return { brand: { connect: { id } } };
    case "category":
      return { category: { connect: { id } } };
    case "posmType":
      return { posmType: { connect: { id } } };
    case "skuType":
      return { skuType: { connect: { id } } };
    case "shopType":
      return { shopType: { connect: { id } } };
  }
}

async function getTagName(type: TagType, id: string): Promise<string | null> {
  switch (type) {
    case "brand":
      return (await prisma.brand.findUnique({ where: { id } }))?.name ?? null;
    case "category":
      return (await prisma.category.findUnique({ where: { id } }))?.name ?? null;
    case "posmType":
      return (await prisma.posmType.findUnique({ where: { id } }))?.name ?? null;
    case "skuType":
      return (await prisma.skuType.findUnique({ where: { id } }))?.name ?? null;
    case "shopType":
      return (await prisma.shopType.findUnique({ where: { id } }))?.name ?? null;
  }
}

async function deleteTagRow(type: TagType, id: string) {
  switch (type) {
    case "brand":
      return prisma.brand.delete({ where: { id } });
    case "category":
      return prisma.category.delete({ where: { id } });
    case "posmType":
      return prisma.posmType.delete({ where: { id } });
    case "skuType":
      return prisma.skuType.delete({ where: { id } });
    case "shopType":
      return prisma.shopType.delete({ where: { id } });
  }
}

export async function countPhotosUsingTag(type: TagType, id: string): Promise<number> {
  return prisma.photoRecord.count({ where: whereForType(type, id) });
}

export async function mergeAndDeleteTag(
  type: TagType,
  deleteId: string,
  mergeIntoId: string | null,
): Promise<void> {
  if (deleteId === mergeIntoId) {
    throw new Error("Cannot merge a tag into itself");
  }

  const affected = await prisma.photoRecord.findMany({
    where: whereForType(type, deleteId),
    include: { brand: true, category: true, posmType: true, skuType: true, shopType: true },
  });

  if (affected.length > 0) {
    if (!mergeIntoId) {
      throw new Error("A merge target is required. This tag is used by existing photos");
    }
    const newName = await getTagName(type, mergeIntoId);
    if (!newName) {
      throw new Error("Merge target not found");
    }

    for (const record of affected) {
      const typeName =
        type === "posmType" || type === "category" || type === "skuType"
          ? newName
          : ((record.kind === "posm"
              ? record.posmType?.name
              : record.kind === "category"
                ? record.category?.name
                : record.skuType?.name) ?? "");

      const filename = generateFilename(
        {
          brand: type === "brand" ? newName : record.brand.name,
          kind: record.kind,
          typeName,
          shopType: type === "shopType" ? newName : record.shopType.name,
        },
        record.capturedAt,
      );

      await prisma.photoRecord.update({
        where: { id: record.id },
        data: { ...updateDataForType(type, mergeIntoId), filename, filenameSyncPending: true },
      });
    }
  }

  await deleteTagRow(type, deleteId);
}

export async function deleteTagAndAllPhotos(type: TagType, id: string): Promise<void> {
  const affected = await prisma.photoRecord.findMany({
    where: whereForType(type, id),
    select: { id: true, driveFileId: true, brandId: true },
  });

  for (const record of affected) {
    if (record.driveFileId) {
      try {
        await deleteDriveFile(record.driveFileId);
      } catch {
        // Drive file already gone or inaccessible — still remove the DB record.
      }
    }
  }

  await prisma.photoRecord.deleteMany({ where: whereForType(type, id) });

  if (type === "brand") {
    // The brand row (and its Drive folder ids) is about to be deleted — grab
    // them first so the now-empty folders can still be cleaned up after.
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { driveFolderId: true, badExecutionDriveFolderId: true },
    });
    await deleteTagRow(type, id);
    await deleteDriveFolderIfEmpty(brand?.driveFolderId);
    await deleteDriveFolderIfEmpty(brand?.badExecutionDriveFolderId);
  } else {
    await deleteTagRow(type, id);
    const affectedBrandIds = [...new Set(affected.map((r) => r.brandId))];
    for (const brandId of affectedBrandIds) {
      await cleanupEmptyBrandFolder(brandId);
    }
  }
}
