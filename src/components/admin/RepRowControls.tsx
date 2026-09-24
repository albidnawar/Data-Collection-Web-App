"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { changeRepPasswordAction, deleteRepAction, editRepAction } from "@/app/admin/reps/actions";

type Panel = "edit" | "password" | "delete" | null;

export function RepRowControls({ repId, name, username }: { repId: string; name: string; username: string }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [editError, editAction, editPending] = useActionState(editRepAction.bind(null, repId), undefined);
  const [pwError, pwAction, pwPending] = useActionState(changeRepPasswordAction.bind(null, repId), undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button type="button" onClick={() => toggle("edit")} className="text-xs font-medium text-blue-600">
          Edit
        </button>
        <button type="button" onClick={() => toggle("password")} className="text-xs font-medium text-amber-600">
          Password
        </button>
        <button type="button" onClick={() => toggle("delete")} className="text-xs font-medium text-red-600">
          Delete
        </button>
      </div>

      {panel === "edit" && (
        <form action={editAction} className="flex flex-wrap items-end gap-2">
          <input
            name="name"
            defaultValue={name}
            required
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            name="username"
            defaultValue={username}
            required
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={editPending}
            className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
          >
            {editPending ? "Saving…" : "Save"}
          </button>
          {editError && <span className="text-xs text-red-600">{editError}</span>}
        </form>
      )}

      {panel === "password" && (
        <form action={pwAction} className="flex flex-wrap items-end gap-2">
          <input
            name="password"
            type="password"
            placeholder="New password"
            required
            minLength={6}
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={pwPending}
            className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {pwPending ? "Saving…" : "Set password"}
          </button>
          {pwError && <span className="text-xs text-red-600">{pwError}</span>}
        </form>
      )}

      {panel === "delete" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Permanently delete this rep?</span>
          <button
            type="button"
            disabled={deletePending}
            onClick={() =>
              startDelete(async () => {
                setDeleteError(null);
                try {
                  await deleteRepAction(repId);
                  setPanel(null);
                } catch (e) {
                  setDeleteError(e instanceof Error ? e.message : "Delete failed");
                }
              })
            }
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {deletePending ? "Deleting…" : "Confirm delete"}
          </button>
          {deleteError && <span className="text-xs text-red-600">{deleteError}</span>}
        </div>
      )}
    </div>
  );
}
