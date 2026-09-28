import {
  getAllPendingUploads,
  removePendingUpload,
  updatePendingUpload,
  type PendingUpload,
} from "@/lib/indexedDb";
import { notifyQueueChanged } from "@/hooks/usePendingQueue";

const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

function backoffDelayMs(attempts: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS);
}

function buildFormData(upload: PendingUpload): FormData {
  const formData = new FormData();
  formData.set("clientQueueId", upload.clientQueueId);
  formData.set("brandName", upload.brand.name);
  formData.set("isPosm", String(upload.isPosm));
  if (upload.category) formData.set("categoryName", upload.category.name);
  if (upload.posmType) formData.set("posmTypeName", upload.posmType.name);
  formData.set("shopTypeName", upload.shopType.name);
  if (upload.gpsLat !== null) formData.set("gpsLat", String(upload.gpsLat));
  if (upload.gpsLng !== null) formData.set("gpsLng", String(upload.gpsLng));
  if (upload.address) formData.set("address", upload.address);
  formData.set("capturedAt", upload.capturedAt);
  formData.set("photo", upload.photoBlob, "photo.jpg");
  return formData;
}

async function uploadOne(upload: PendingUpload): Promise<boolean> {
  await updatePendingUpload(upload.clientQueueId, { status: "uploading" });
  notifyQueueChanged();

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: buildFormData(upload),
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`);
    }

    await removePendingUpload(upload.clientQueueId);
    notifyQueueChanged();
    return true;
  } catch (error) {
    const attempts = upload.attempts + 1;
    const lastError = error instanceof Error ? error.message : "Upload failed";
    const willRetry = attempts < MAX_ATTEMPTS;
    await updatePendingUpload(upload.clientQueueId, {
      status: willRetry ? "queued" : "failed",
      attempts,
      lastError,
      nextRetryAt: willRetry ? new Date(Date.now() + backoffDelayMs(attempts)).toISOString() : null,
    });
    notifyQueueChanged();
    return false;
  }
}

let draining = false;

export async function drainUploadQueue(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  draining = true;
  try {
    const all = await getAllPendingUploads();
    const now = Date.now();
    const toUpload = all.filter(
      (u) =>
        (u.status === "queued" || u.status === "uploading") &&
        (!u.nextRetryAt || new Date(u.nextRetryAt).getTime() <= now),
    );
    for (const upload of toUpload) {
      await uploadOne(upload);
    }
  } finally {
    draining = false;
  }
}

export async function retryUpload(clientQueueId: string): Promise<void> {
  await updatePendingUpload(clientQueueId, {
    status: "queued",
    attempts: 0,
    lastError: null,
    nextRetryAt: null,
  });
  void drainUploadQueue();
}
