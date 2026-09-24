"use client";

import { useCallback, useEffect, useState } from "react";
import { getTagCache, setTagCache, addTagToCache, type TagCache, type TagOption } from "@/lib/indexedDb";
import type { TagType } from "@/lib/tagTypes";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

type CacheKey = "brands" | "categories" | "posmTypes" | "shopTypes";

const TYPE_TO_CACHE_KEY: Record<TagType, CacheKey> = {
  brand: "brands",
  category: "categories",
  posmType: "posmTypes",
  shopType: "shopTypes",
};

export function useTagCache() {
  const [cache, setCache] = useState<TagCache | null>(null);

  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      await setTagCache(data);
      setCache((await getTagCache()) ?? null);
    } catch {
      // offline or request failed — keep serving whatever is already cached
    }
  }, []);

  useEffect(() => {
    getTagCache().then((cached) => {
      if (cached) {
        setCache(cached);
        const age = Date.now() - new Date(cached.fetchedAt).getTime();
        if (age > REFRESH_INTERVAL_MS && navigator.onLine) {
          void refreshFromServer();
        }
      } else if (navigator.onLine) {
        void refreshFromServer();
      }
    });
  }, [refreshFromServer]);

  const addLocalTag = useCallback(async (type: TagType, tag: TagOption) => {
    await addTagToCache(TYPE_TO_CACHE_KEY[type], tag);
    setCache((await getTagCache()) ?? null);
  }, []);

  return { cache, refreshFromServer, addLocalTag };
}
