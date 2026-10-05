"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BatchResult {
  processed: number;
  fixed: number;
  alreadyOk: number;
  unknown: number;
  empty: number;
  remaining: number;
}

export function FixCorruptedPhotosButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<{ checked: number; fixed: number; unknown: number; empty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setTotals({ checked: 0, fixed: 0, unknown: 0, empty: 0 });

    try {
      let remaining = 1;
      while (remaining > 0) {
        const res = await fetch("/api/admin/photos/fix-corrupted", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Something went wrong. Please try again.");
        }
        const data = (await res.json()) as BatchResult;
        setTotals((prev) => ({
          checked: (prev?.checked ?? 0) + data.processed,
          fixed: (prev?.fixed ?? 0) + data.fixed,
          unknown: (prev?.unknown ?? 0) + data.unknown,
          empty: (prev?.empty ?? 0) + data.empty,
        }));
        remaining = data.remaining;
        if (data.processed === 0) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setRunning(false);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {running ? "Fixing…" : "Fix corrupted photos"}
      </button>
      {totals && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Checked {totals.checked} — fixed {totals.fixed}
          {totals.empty > 0 ? `, ${totals.empty} empty (need retaking)` : ""}
          {totals.unknown > 0 ? `, ${totals.unknown} unreadable` : ""}
          {totals.empty > 0 || totals.unknown > 0 ? " (see below)" : ""}
        </p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
