"use client";

import { useActionState } from "react";
import { renameTagAction } from "@/app/admin/tags/actions";
import type { TagType } from "@/lib/tagTypes";

export function RenameTagForm({ type, id, name }: { type: TagType; id: string; name: string }) {
  const boundAction = renameTagAction.bind(null, type, id);
  const [error, formAction, isPending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1">
      <div className="flex gap-2">
        <input
          name="name"
          defaultValue={name}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
