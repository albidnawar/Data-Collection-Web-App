"use client";

import { useActionState } from "react";
import { deleteOutletsByCsvAction, type DeleteOutletsByCsvResult } from "@/app/admin/outlets/actions";

export function DeleteOutletsCsvForm() {
  const [result, formAction, isPending] = useActionState<DeleteOutletsByCsvResult | undefined, FormData>(
    deleteOutletsByCsvAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Delete outlets by CSV</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        A file of outlet codes to remove — the same <code>code,town,lat,lng</code> sheet works (other columns are
        ignored), or just a bare list of codes, one per line.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm text-gray-700 dark:text-gray-300"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Delete these outlets"}
        </button>
      </div>
      {result && (
        <p className={`text-xs font-medium ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</p>
      )}
    </form>
  );
}
