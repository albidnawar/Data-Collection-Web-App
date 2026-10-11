"use client";

import { useState, useTransition } from "react";
import { updatePhotoTagsAction } from "@/app/admin/photos/actions";
import type { PhotoKind } from "@/lib/tagTypes";

interface Option {
  id: string;
  name: string;
}

export function PhotoTagsCells({
  photoId,
  kind,
  brandId,
  brandName,
  typeId,
  typeName,
  shopTypeId,
  shopTypeName,
  isGoodExecution,
  brands,
  shopTypes,
  typeOptions,
}: {
  photoId: string;
  kind: PhotoKind;
  brandId: string;
  brandName: string;
  typeId: string | null;
  typeName: string | null;
  shopTypeId: string;
  shopTypeName: string;
  isGoodExecution: boolean;
  brands: Option[];
  shopTypes: Option[];
  typeOptions: Option[];
}) {
  const [editing, setEditing] = useState(false);
  const [draftBrandId, setDraftBrandId] = useState(brandId);
  const [draftTypeId, setDraftTypeId] = useState(typeId ?? "");
  const [draftShopTypeId, setDraftShopTypeId] = useState(shopTypeId);
  const [draftIsGood, setDraftIsGood] = useState(isGoodExecution);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startEdit = () => {
    setDraftBrandId(brandId);
    setDraftTypeId(typeId ?? "");
    setDraftShopTypeId(shopTypeId);
    setDraftIsGood(isGoodExecution);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePhotoTagsAction(photoId, {
        brandId: draftBrandId,
        shopTypeId: draftShopTypeId,
        categoryId: kind === "category" ? draftTypeId || null : undefined,
        posmTypeId: kind === "posm" ? draftTypeId || null : undefined,
        skuTypeId: kind === "sku" ? draftTypeId || null : undefined,
        isGoodExecution: draftIsGood,
      });
      if (result.ok) {
        setEditing(false);
      } else {
        setError(result.message);
      }
    });
  };

  if (!editing) {
    return (
      <>
        <td className="px-3 py-2">{brandName}</td>
        <td className="px-3 py-2">{typeName ?? "-"}</td>
        <td className="px-3 py-2">{shopTypeName}</td>
        <td className="px-3 py-2">
          <span className={isGoodExecution ? "text-green-600" : "text-red-600"}>
            {isGoodExecution ? "Good" : "Bad"}
          </span>
        </td>
        <td className="px-3 py-2">
          <button type="button" onClick={startEdit} className="text-xs font-medium text-blue-600">
            Edit
          </button>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-3 py-2">
        <select
          value={draftBrandId}
          onChange={(e) => setDraftBrandId(e.target.value)}
          className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={draftTypeId}
          onChange={(e) => setDraftTypeId(e.target.value)}
          className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">-</option>
          {typeOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={draftShopTypeId}
          onChange={(e) => setDraftShopTypeId(e.target.value)}
          className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          {shopTypes.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={draftIsGood ? "good" : "bad"}
          onChange={(e) => setDraftIsGood(e.target.value === "good")}
          className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="good">Good</option>
          <option value="bad">Bad</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500">
              Cancel
            </button>
          </div>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </td>
    </>
  );
}
