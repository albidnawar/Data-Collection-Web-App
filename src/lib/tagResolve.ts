import { prisma } from "@/lib/db";
import type { TagType } from "@/lib/tagTypes";

interface TagRow {
  id: string;
  name: string;
}

function findFirstCaseInsensitive(type: TagType, name: string): Promise<TagRow | null> {
  const where = { name: { equals: name, mode: "insensitive" as const } };
  switch (type) {
    case "brand":
      return prisma.brand.findFirst({ where, select: { id: true, name: true } });
    case "category":
      return prisma.category.findFirst({ where, select: { id: true, name: true } });
    case "posmType":
      return prisma.posmType.findFirst({ where, select: { id: true, name: true } });
    case "skuType":
      return prisma.skuType.findFirst({ where, select: { id: true, name: true } });
    case "shopType":
      return prisma.shopType.findFirst({ where, select: { id: true, name: true } });
  }
}

function create(type: TagType, name: string, createdById: string | null) {
  const data = { name, createdById };
  switch (type) {
    case "brand":
      return prisma.brand.create({ data });
    case "category":
      return prisma.category.create({ data });
    case "posmType":
      return prisma.posmType.create({ data });
    case "skuType":
      return prisma.skuType.create({ data });
    case "shopType":
      return prisma.shopType.create({ data });
  }
}

/**
 * Case-insensitive find-or-create: reuses an existing "Marico" row for an incoming
 * "marico" instead of letting the DB's case-sensitive unique constraint allow both.
 * Falls back to a re-lookup if two concurrent creates race into the unique constraint.
 */
export async function resolveOrCreateTag(type: TagType, name: string, createdById: string) {
  const existing = await findFirstCaseInsensitive(type, name);
  if (existing) return existing;

  try {
    return await create(type, name, createdById);
  } catch {
    const race = await findFirstCaseInsensitive(type, name);
    if (race) return race;
    throw new Error(`Failed to create ${type} "${name}"`);
  }
}

/**
 * Finds an existing tag whose name matches case-insensitively, excluding a given id
 * (used before renaming a tag, so it isn't blocked by matching itself).
 */
export async function findExistingTagCaseInsensitive(
  type: TagType,
  name: string,
  excludeId?: string,
): Promise<TagRow | null> {
  const match = await findFirstCaseInsensitive(type, name);
  if (match && match.id !== excludeId) return match;
  return null;
}
