"use client";

import { useAutoSync } from "@/hooks/useAutoSync";

export function SyncManager() {
  useAutoSync();
  return null;
}
