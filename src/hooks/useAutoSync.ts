"use client";

import { useEffect } from "react";
import { drainUploadQueue } from "@/lib/syncQueue";

const PERIODIC_INTERVAL_MS = 25000;

export function useAutoSync() {
  useEffect(() => {
    void drainUploadQueue();

    const onOnline = () => void drainUploadQueue();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void drainUploadQueue();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => void drainUploadQueue(), PERIODIC_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, []);
}
