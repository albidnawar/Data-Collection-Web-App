"use client";

import { useState, useTransition } from "react";
import { rerunFilenameSyncAction } from "@/app/admin/tags/actions";

export function RerunSyncButton({ pendingCount }: { pendingCount: number }) {
  const [result, setResult] = useState<{ processed: number; failed: number; remaining: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  if (pendingCount === 0 && !result) return null;

  const run = () => {
    startTransition(async () => {
      const r = await rerunFilenameSyncAction();
      setResult(r);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
        {result
          ? `Processed ${result.processed}, failed ${result.failed}, ${result.remaining} still pending.`
          : `${pendingCount} photo${pendingCount === 1 ? "" : "s"} need their Drive file renamed/refiled after a merge.`}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending || (result !== null && result.remaining === 0)}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Running…" : "Rerun filename sync"}
      </button>
    </div>
  );
}
