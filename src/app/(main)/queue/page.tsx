"use client";

import { useEffect, useMemo } from "react";
import { usePendingQueue } from "@/hooks/usePendingQueue";
import { retryUpload } from "@/lib/syncQueue";
import type { PendingUpload } from "@/lib/indexedDb";

function QueueItem({ item }: { item: PendingUpload }) {
  const previewUrl = useMemo(() => URL.createObjectURL(item.photoBlob), [item.photoBlob]);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const statusLabel: Record<PendingUpload["status"], string> = {
    queued: "Queued",
    uploading: "Uploading…",
    failed: "Failed",
    uploaded: "Uploaded",
  };

  const statusColor: Record<PendingUpload["status"], string> = {
    queued: "text-amber-600",
    uploading: "text-blue-600",
    failed: "text-red-600",
    uploaded: "text-green-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {item.brand.name} · {item.shopType.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {item.isPosm ? item.posmType?.name ?? "POSM" : "No POSM"} · {item.category.name}
        </p>
        <p className={`text-xs font-semibold ${statusColor[item.status]}`}>
          {statusLabel[item.status]}
          {item.status === "failed" && item.lastError ? ` — ${item.lastError}` : ""}
        </p>
      </div>
      {item.status === "failed" && (
        <button
          type="button"
          onClick={() => retryUpload(item.clientQueueId)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default function QueuePage() {
  const { items, refresh } = usePendingQueue();

  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Queue</h1>
      <button
        type="button"
        onClick={() => void refresh()}
        className="self-start text-sm font-medium text-blue-600"
      >
        Refresh
      </button>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No photos queued.</p>
      ) : (
        items.map((item) => <QueueItem key={item.clientQueueId} item={item} />)
      )}
    </div>
  );
}
