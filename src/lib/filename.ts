import type { PhotoKind } from "@/lib/tagTypes";

export interface FilenameTags {
  // Null only for the outlet's own outside/storefront photo (kind "outlet"),
  // which isn't tied to one brand or shop type.
  brand: string | null;
  kind: PhotoKind;
  typeName: string;
  shopType: string | null;
}

const KIND_FILENAME_PART: Record<PhotoKind, string> = {
  posm: "POSM",
  category: "CategoryShelfDisplay",
  sku: "SKU",
  outlet: "Outlet",
};

export function sanitizeForFilename(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/_{2,}/g, "_")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 40);

  return cleaned.length > 0 ? cleaned : "Unknown";
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}${min}${s}`;
}

export function generateFilename(tags: FilenameTags, capturedAt: Date): string {
  const kindPart = KIND_FILENAME_PART[tags.kind];
  const typePart = sanitizeForFilename(tags.typeName);
  const datePart = formatDate(capturedAt);
  const timePart = formatTime(capturedAt);

  const parts = [
    tags.brand !== null ? sanitizeForFilename(tags.brand) : null,
    kindPart,
    typePart,
    tags.shopType !== null ? sanitizeForFilename(tags.shopType) : null,
    datePart,
    timePart,
  ].filter((p): p is string => p !== null);

  return `${parts.join("_")}.jpg`;
}
