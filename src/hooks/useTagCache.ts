"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTagCache, setTagCache, addTagToCache, removeTagFromCache, type TagCache, type TagOption } from "@/lib/indexedDb";
import type { TagType } from "@/lib/tagTypes";

const PERIODIC_REFRESH_MS = 15000;

type CacheKey = "brands" | "categories" | "posmTypes" | "skuTypes" | "shopTypes";

const TYPE_TO_CACHE_KEY: Record<TagType, CacheKey> = {
  brand: "brands",
  category: "categories",
  posmType: "posmTypes",
  skuType: "skuTypes",
  shopType: "shopTypes",
};

interface PendingTag {
  type: TagType;
  tag: TagOption;
}

export function useTagCache() {
  const [cache, setCache] = useState<TagCache | null>(null);
  // Tags added locally that haven't been confirmed as saved server-side yet.
  // A periodic/reconnect refresh must not wipe these out from under the rep
  // while the POST that actually persists them is still in flight (or retrying
  // after a flaky mobile connection dropped it).
  const pendingRef = useRef<PendingTag[]>([]);

  const syncPendingTag = useCallback(async (type: TagType, name: string) => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name }),
      });
      if (res.ok) {
        pendingRef.current = pendingRef.current.filter((p) => !(p.type === type && p.tag.name === name));
      }
    } catch {
      // stays pending — retried on the next reconnect/periodic tick
    }
  }, []);

  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      await setTagCache(data);

      // Anything the server now confirms doesn't need protecting anymore.
      pendingRef.current = pendingRef.current.filter(({ type, tag }) => {
        const known: TagOption[] = data[TYPE_TO_CACHE_KEY[type]] ?? [];
        return !known.some((t) => t.name.toLowerCase() === tag.name.toLowerCase());
      });

      for (const { type, tag } of pendingRef.current) {
        await addTagToCache(TYPE_TO_CACHE_KEY[type], tag);
      }
      setCache((await getTagCache()) ?? null);
    } catch {
      // offline or request failed — keep serving whatever is already cached
    }
  }, []);

  useEffect(() => {
    getTagCache().then((cached) => {
      if (cached) {
        setCache(cached);
      }
      if (navigator.onLine) {
        void refreshFromServer();
      }
    });

    const retryPending = () => {
      for (const { type, tag } of pendingRef.current) void syncPendingTag(type, tag.name);
    };

    const onOnline = () => {
      void refreshFromServer();
      retryPending();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFromServer();
        retryPending();
      }
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => {
      void refreshFromServer();
      retryPending();
    }, PERIODIC_REFRESH_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [refreshFromServer, syncPendingTag]);

  const addLocalTag = useCallback(
    async (type: TagType, name: string) => {
      const tag: TagOption = { id: crypto.randomUUID(), name };
      pendingRef.current.push({ type, tag });
      await addTagToCache(TYPE_TO_CACHE_KEY[type], tag);
      setCache((await getTagCache()) ?? null);
      void syncPendingTag(type, name);
    },
    [syncPendingTag],
  );

  const removeLocalTag = useCallback(async (type: TagType, name: string) => {
    pendingRef.current = pendingRef.current.filter((p) => !(p.type === type && p.tag.name === name));
    await removeTagFromCache(TYPE_TO_CACHE_KEY[type], name);
    setCache((await getTagCache()) ?? null);
  }, []);

  return { cache, refreshFromServer, addLocalTag, removeLocalTag };
}
