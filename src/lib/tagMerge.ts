import { prisma } from "@/lib/db";
import { generateFilename } from "@/lib/filename";
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
    include: { brand: true, category: true, posmType: true, shopType: true },
  });

  if (affected.length > 0) {
    if (!mergeIntoId) {
      throw new Error("A merge target is required — this tag is used by existing photos");
    }
    const newName = await getTagName(type, mergeIntoId);
    if (!newName) {
      throw new Error("Merge target not found");
    }

    for (const record of affected) {
      const typeName =
        type === "posmType" || type === "category"
          ? newName
          : ((record.isPosm ? record.posmType?.name : record.category?.name) ?? "");

      const filename = generateFilename(
        {
          brand: type === "brand" ? newName : record.brand.name,
          isPosm: record.isPosm,
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
