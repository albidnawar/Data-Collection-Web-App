import type { TagType } from "@/lib/tagTypes";

const STORAGE_KEY = "fieldlenz.recentTags";

type RecentMap = Record<string, number>;

function loadAll(): Record<TagType, RecentMap> {
  if (typeof window === "undefined") {
    return { brand: {}, category: {}, posmType: {}, shopType: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { brand: {}, category: {}, posmType: {}, shopType: {} };
    return JSON.parse(raw);
  } catch {
    return { brand: {}, category: {}, posmType: {}, shopType: {} };
  }
}

function saveAll(data: Record<TagType, RecentMap>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — ordering just won't persist, non-fatal
  }
}

export function recordTagUse(type: TagType, name: string) {
  const all = loadAll();
  all[type] = { ...all[type], [name]: Date.now() };
  saveAll(all);
}

export function sortByMostRecentlyUsed<T extends { name: string }>(
  type: TagType,
  options: T[],
): T[] {
  const recents = loadAll()[type] ?? {};
  return [...options].sort((a, b) => (recents[b.name] ?? 0) - (recents[a.name] ?? 0));
}
