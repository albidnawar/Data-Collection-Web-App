"use client";

import { useState, useTransition } from "react";
import { deleteAttendanceAction } from "@/app/admin/attendance/actions";

export function DeleteAttendanceButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteAttendanceAction(id);
      if (result.error) {
        // The row is gone from the table by the time this resolves (the action
        // already revalidated the list), so a toast tied to this row's own
        // lifetime wouldn't be seen — an alert is the simplest way to still
        // surface a rare Drive-cleanup failure to the admin.
        alert(result.error);
      }
    });
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium text-red-600">
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleConfirm}
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-gray-500">
        Cancel
      </button>
    </div>
  );
}
