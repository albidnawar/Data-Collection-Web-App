"use client";

import { useState, useTransition } from "react";
import { countPhotosForTagAction, deleteTagAction, deleteTagAndPhotosAction } from "@/app/admin/tags/actions";
import type { TagType } from "@/lib/tagTypes";

interface Props {
  type: TagType;
  id: string;
  otherOptions: { id: string; name: string }[];
}

type Mode = "merge" | "hard";

export function TagDeleteControl({ type, id, otherOptions }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState<Mode>("merge");
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [mergeInto, setMergeInto] = useState(otherOptions[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startConfirm = () => {
    setConfirming(true);
    setMode("merge");
    setError(null);
    setPassword("");
    setMergeInto(otherOptions[0]?.id ?? "");
    startTransition(async () => {
      const count = await countPhotosForTagAction(type, id);
      setPhotoCount(count);
    });
  };

  const confirmMergeDelete = () => {
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

  const confirmHardDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTagAndPhotosAction(type, id, password);
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
            : `Used by ${photoCount} photo${photoCount === 1 ? "" : "s"}.`}
      </span>

      {mode === "merge" ? (
        <>
          {needsMerge &&
            (otherOptions.length > 0 ? (
              <>
                <span className="text-xs text-gray-700 dark:text-gray-300">Merge them into:</span>
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
              </>
            ) : (
              <span className="text-xs text-red-600">Add another value first — nothing to merge into.</span>
            ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmMergeDelete}
              disabled={pending || (needsMerge && otherOptions.length === 0)}
              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            {photoCount !== null && photoCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMode("hard");
                  setError(null);
                }}
                className="text-xs font-medium text-red-800 underline dark:text-red-300"
              >
                Delete tag and its photos permanently instead
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="text-xs font-semibold text-red-800 dark:text-red-300">
            This permanently deletes the tag AND all {photoCount} photo{photoCount === 1 ? "" : "s"} tagged with
            it (including their Drive files). This cannot be undone.
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmHardDelete}
              disabled={pending || password.length === 0}
              className="rounded bg-red-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Permanently delete tag and photos"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("merge");
                setError(null);
              }}
              className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              Back
            </button>
          </div>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
