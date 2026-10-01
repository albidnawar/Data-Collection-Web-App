export const TAG_TYPES = ["brand", "category", "posmType", "skuType", "shopType"] as const;

export type TagType = (typeof TAG_TYPES)[number];

export function isTagType(value: unknown): value is TagType {
  return typeof value === "string" && (TAG_TYPES as readonly string[]).includes(value);
}

export const PHOTO_KINDS = ["posm", "category", "sku"] as const;

export type PhotoKind = (typeof PHOTO_KINDS)[number];

export function isPhotoKind(value: unknown): value is PhotoKind {
  return typeof value === "string" && (PHOTO_KINDS as readonly string[]).includes(value);
}
