export interface FilenameTags {
  brand: string;
  isPosm: boolean;
  typeName: string;
  shopType: string;
}

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
  const brand = sanitizeForFilename(tags.brand);
  const kindPart = tags.isPosm ? "POSM" : "CategoryShelfDisplay";
  const typePart = sanitizeForFilename(tags.typeName);
  const shopPart = sanitizeForFilename(tags.shopType);
  const datePart = formatDate(capturedAt);
  const timePart = formatTime(capturedAt);

  return `${[brand, kindPart, typePart, shopPart, datePart, timePart].join("_")}.jpg`;
}
