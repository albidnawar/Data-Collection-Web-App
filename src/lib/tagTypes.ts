export const TAG_TYPES = ["brand", "category", "posmType", "shopType"] as const;

export type TagType = (typeof TAG_TYPES)[number];

export function isTagType(value: unknown): value is TagType {
  return typeof value === "string" && (TAG_TYPES as readonly string[]).includes(value);
}
