"use client";

import { useCallback, useEffect, useState } from "react";

const PERIODIC_REFRESH_MS = 25000;

export function useTodayPhotoCount() {
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/photos/today-count");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count);
    } catch {
      // Offline or request failed — keep showing whatever count we last had.
    }
  }, []);

  useEffect(() => {
    // Client-only fetch whose result can't be known during render — same
    // pattern as the other queue/tag-cache hooks in this codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const onEvent = () => void refresh();
    window.addEventListener("focus", onEvent);
    window.addEventListener("fieldlenz:queue-changed", onEvent);
    const interval = window.setInterval(onEvent, PERIODIC_REFRESH_MS);

    return () => {
      window.removeEventListener("focus", onEvent);
      window.removeEventListener("fieldlenz:queue-changed", onEvent);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return count;
}
