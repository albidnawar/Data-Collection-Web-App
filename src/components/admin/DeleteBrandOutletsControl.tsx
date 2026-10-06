"use client";

import { useState, useTransition } from "react";
import { countOutletsForBrandAction, deleteOutletsByBrandAction } from "@/app/admin/outlets/actions";

export function DeleteBrandOutletsControl({ brands }: { brands: { id: string; name: string }[] }) {
  const [brandId, setBrandId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedBrand = brands.find((b) => b.id === brandId);

  const startConfirm = () => {
    if (!brandId) return;
    setConfirming(true);
    setDone(null);
    setCount(null);
    startTransition(async () => {
      const n = await countOutletsForBrandAction(brandId);
      setCount(n);
    });
  };

  const confirmDelete = () => {
    if (!brandId) return;
    startTransition(async () => {
      await deleteOutletsByBrandAction(brandId);
      setConfirming(false);
      setDone(`Deleted ${count} outlet${count === 1 ? "" : "s"} for ${selectedBrand?.name}.`);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Delete all outlets for a brand</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setConfirming(false);
            setDone(null);
          }}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">Select brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {!confirming && (
          <button
            type="button"
            onClick={startConfirm}
            disabled={!brandId}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Delete all outlets for this brand
          </button>
        )}
      </div>

      {confirming && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950">
          <span className="text-xs font-semibold text-red-800 dark:text-red-300">
            {count === null
              ? "Checking…"
              : `This permanently deletes all ${count} outlet${count === 1 ? "" : "s"} for ${selectedBrand?.name}. This cannot be undone.`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={pending || count === null || count === 0}
              className="rounded bg-red-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
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
        </div>
      )}

      {done && <p className="text-xs font-medium text-green-600">{done}</p>}
    </div>
  );
}
