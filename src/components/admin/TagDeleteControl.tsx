"use client";

import { useState, useTransition } from "react";
import { countPhotosForTagAction, deleteTagAction } from "@/app/admin/tags/actions";
import type { TagType } from "@/lib/tagTypes";

interface Props {
  type: TagType;
  id: string;
  otherOptions: { id: string; name: string }[];
}

export function TagDeleteControl({ type, id, otherOptions }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [mergeInto, setMergeInto] = useState(otherOptions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startConfirm = () => {
    setConfirming(true);
    setError(null);
    setMergeInto(otherOptions[0]?.id ?? "");
    startTransition(async () => {
      const count = await countPhotosForTagAction(type, id);
      setPhotoCount(count);
    });
  };

  const confirmDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTagAction(type, id, mergeInto || null);
        setConfirming(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  if (!confirming) {
    return (
      <button type="button" onClick={startConfirm} className="text-xs font-medium text-red-600">
        Delete
      </button>
    );
  }

  const needsMerge = photoCount === null || photoCount > 0;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950">
      <span className="text-xs text-gray-700 dark:text-gray-300">
        {photoCount === null
          ? "Checking usage…"
          : photoCount === 0
            ? "Not used by any photos."
            : `Used by ${photoCount} photo${photoCount === 1 ? "" : "s"} — merge them into:`}
      </span>
      {needsMerge &&
        (otherOptions.length > 0 ? (
          <select
            value={mergeInto}
            onChange={(e) => setMergeInto(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            {otherOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-red-600">Add another value first — nothing to merge into.</span>
        ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmDelete}
          disabled={pending || (needsMerge && otherOptions.length === 0)}
          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
