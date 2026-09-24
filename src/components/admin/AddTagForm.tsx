"use client";

import { useActionState } from "react";
import { addTagAction } from "@/app/admin/tags/actions";
import type { TagType } from "@/lib/tagTypes";

export function AddTagForm({ type, label }: { type: TagType; label: string }) {
  const boundAction = addTagAction.bind(null, type);
  const [error, formAction, isPending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder={`New ${label}`}
          required
          className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
