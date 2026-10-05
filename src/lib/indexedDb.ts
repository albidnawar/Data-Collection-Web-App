import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PhotoKind } from "@/lib/tagTypes";

export type UploadQueueStatus = "queued" | "uploading" | "failed" | "uploaded";

export interface TagRef {
  id: string | null;
  name: string;
}

export interface PendingUpload {
  clientQueueId: string;
  // Raw bytes rather than a Blob reference — Safari/WebKit has a known bug
  // where a Blob stored in IndexedDB can read back empty after the photo
  // sits queued for a while (phone locked, backgrounded, low storage).
  // Plain binary data survives the IndexedDB round-trip reliably.
  photoBuffer: ArrayBuffer;
  // Present only on records queued by an older app version, before this
  // field was renamed — read as a fallback, never written anymore.
  photoBlob?: Blob;
  brand: TagRef;
  kind: PhotoKind;
  isGoodExecution: boolean;
  category: TagRef | null;
  posmType: TagRef | null;
  skuType: TagRef | null;
  shopType: TagRef;
  gpsLat: number | null;
  gpsLng: number | null;
  address: string | null;
  surroundingRemarks: string | null;
  otherRemarks: string | null;
  shelfVacancy: boolean | null;
  capturedAt: string;
  status: UploadQueueStatus;
  attempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
}

export interface TagOption {
  id: string;
  name: string;
}

export interface TagCache {
  brands: TagOption[];
  categories: TagOption[];
  posmTypes: TagOption[];
  skuTypes: TagOption[];
  shopTypes: TagOption[];
  fetchedAt: string;
}

interface FieldlenzDB extends DBSchema {
  pendingUploads: {
    key: string;
    value: PendingUpload;
    indexes: { "by-status": string };
  };
  tagCache: {
    key: string;
    value: TagCache;
  };
}

const TAG_CACHE_KEY = "current";

let dbPromise: Promise<IDBPDatabase<FieldlenzDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<FieldlenzDB>("fieldlenz", 1, {
      upgrade(db) {
        const uploads = db.createObjectStore("pendingUploads", { keyPath: "clientQueueId" });
        uploads.createIndex("by-status", "status");
        db.createObjectStore("tagCache");
      },
    });
  }
  return dbPromise;
}

/** Reconstructs a Blob from a queued upload, preferring the modern
 * `photoBuffer` field and falling back to `photoBlob` for records queued
 * by an older app version before that field was renamed. */
export function pendingUploadToBlob(upload: PendingUpload): Blob {
  if (upload.photoBuffer) return new Blob([upload.photoBuffer], { type: "image/jpeg" });
  if (upload.photoBlob) return upload.photoBlob;
  throw new Error("No photo data found for this queued upload");
}

export async function addPendingUpload(upload: PendingUpload) {
  const db = await getDb();
  await db.put("pendingUploads", upload);
}

export async function getAllPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDb();
  const all = await db.getAll("pendingUploads");
  return all.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function getPendingUpload(clientQueueId: string) {
  const db = await getDb();
  return db.get("pendingUploads", clientQueueId);
}

export async function updatePendingUpload(
  clientQueueId: string,
  changes: Partial<PendingUpload>,
) {
  const db = await getDb();
  const existing = await db.get("pendingUploads", clientQueueId);
  if (!existing) return;
  await db.put("pendingUploads", { ...existing, ...changes });
}

export async function removePendingUpload(clientQueueId: string) {
  const db = await getDb();
  await db.delete("pendingUploads", clientQueueId);
}

export async function countPendingUploads(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll("pendingUploads");
  return all.filter((u) => u.status !== "uploaded").length;
}

export async function getTagCache(): Promise<TagCache | undefined> {
  const db = await getDb();
  return db.get("tagCache", TAG_CACHE_KEY);
}

export async function setTagCache(cache: Omit<TagCache, "fetchedAt">) {
  const db = await getDb();
  await db.put("tagCache", { ...cache, fetchedAt: new Date().toISOString() }, TAG_CACHE_KEY);
}

export async function addTagToCache(type: keyof Omit<TagCache, "fetchedAt">, tag: TagOption) {
  const db = await getDb();
  const existing = await db.get("tagCache", TAG_CACHE_KEY);
  if (!existing) return;
  if (existing[type].some((t) => t.name === tag.name)) return;
  existing[type] = [...existing[type], tag];
  await db.put("tagCache", existing, TAG_CACHE_KEY);
}

export async function removeTagFromCache(type: keyof Omit<TagCache, "fetchedAt">, name: string) {
  const db = await getDb();
  const existing = await db.get("tagCache", TAG_CACHE_KEY);
  if (!existing) return;
  existing[type] = existing[type].filter((t) => t.name !== name);
  await db.put("tagCache", existing, TAG_CACHE_KEY);
}
