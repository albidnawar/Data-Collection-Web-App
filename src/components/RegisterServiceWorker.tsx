"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    import("@serwist/window").then(({ Serwist }) => {
      if (cancelled) return;
      const serwist = new Serwist("/sw.js");
      serwist.register();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
