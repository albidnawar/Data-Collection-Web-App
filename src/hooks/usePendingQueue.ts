"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllPendingUploads, type PendingUpload } from "@/lib/indexedDb";

export function usePendingQueue() {
  const [items, setItems] = useState<PendingUpload[]>([]);

  const refresh = useCallback(async () => {
    setItems(await getAllPendingUploads());
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllPendingUploads().then((all) => {
      if (!cancelled) setItems(all);
    });
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("fieldlenz:queue-changed", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("fieldlenz:queue-changed", onFocus);
    };
  }, [refresh]);

  const pendingCount = items.filter((i) => i.status !== "uploaded").length;

  return { items, pendingCount, refresh };
}

export function notifyQueueChanged() {
  window.dispatchEvent(new Event("fieldlenz:queue-changed"));
}
