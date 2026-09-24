import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type UploadQueueStatus = "queued" | "uploading" | "failed" | "uploaded";

export interface TagRef {
  id: string | null;
  name: string;
}

export interface PendingUpload {
  clientQueueId: string;
  photoBlob: Blob;
  brand: TagRef;
  isPosm: boolean;
  category: TagRef;
  posmType: TagRef | null;
  shopType: TagRef;
  shopName: string;
  gpsLat: number | null;
  gpsLng: number | null;
  address: string | null;
  capturedAt: string;
  status: UploadQueueStatus;
  attempts: number;
  lastError: string | null;
}

export interface TagOption {
  id: string;
  name: string;
}

export interface TagCache {
  brands: TagOption[];
  categories: TagOption[];
  posmTypes: TagOption[];
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
