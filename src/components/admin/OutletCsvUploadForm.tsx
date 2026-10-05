"use client";

import { useActionState } from "react";
import { importOutletsAction, type ImportOutletsResult } from "@/app/admin/outlets/actions";

export function OutletCsvUploadForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [result, formAction, isPending] = useActionState<ImportOutletsResult | undefined, FormData>(
    importOutletsAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Import outlets</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        CSV with a header row: <code>code,lat,lng</code> (latitude/longitude also accepted). Every outlet in the file is
        tagged with the brand you pick below — uploading the same codes again updates their coordinates and brand.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="brandId"
          required
          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">Select brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
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
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Importing…" : "Import"}
        </button>
      </div>
      {result && (
        <p className={`text-xs font-medium ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</p>
      )}
    </form>
  );
}
