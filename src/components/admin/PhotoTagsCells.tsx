"use client";

import { useState, useTransition } from "react";
import { updatePhotoTagsAction } from "@/app/admin/photos/actions";
import { PHOTO_KINDS, type PhotoKind } from "@/lib/tagTypes";

const KIND_LABELS: Record<PhotoKind, string> = {
  posm: "POSM",
  category: "Category Shelf Display",
  sku: "SKU",
  outlet: "Outlet",
};

interface Option {
  id: string;
  name: string;
}

export function PhotoTagsCells({
  photoId,
  kind,
  outletName,
  brandId,
  brandName,
  typeId,
  typeName,
  shopTypeId,
  shopTypeName,
  isGoodExecution,
  brands,
  shopTypes,
  categories,
  posmTypes,
  skuTypes,
}: {
  photoId: string;
  kind: PhotoKind;
  outletName: string | null;
  brandId: string | null;
  brandName: string | null;
  typeId: string | null;
  typeName: string | null;
  shopTypeId: string | null;
  shopTypeName: string | null;
  isGoodExecution: boolean;
  brands: Option[];
  shopTypes: Option[];
  categories: Option[];
  posmTypes: Option[];
  skuTypes: Option[];
}) {
  const [editing, setEditing] = useState(false);
  const [draftKind, setDraftKind] = useState<PhotoKind>(kind);
  const [draftBrandId, setDraftBrandId] = useState(brandId ?? "");
  const [draftTypeId, setDraftTypeId] = useState(typeId ?? "");
  const [draftShopTypeId, setDraftShopTypeId] = useState(shopTypeId ?? "");
  const [draftIsGood, setDraftIsGood] = useState(isGoodExecution);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startEdit = () => {
    setDraftKind(kind);
    setDraftBrandId(brandId ?? "");
    setDraftTypeId(typeId ?? "");
    setDraftShopTypeId(shopTypeId ?? "");
    setDraftIsGood(isGoodExecution);
    setError(null);
    setEditing(true);
  };

  const changeDraftKind = (nextKind: PhotoKind) => {
    setDraftKind(nextKind);
    // The type picked (category/POSM/SKU) is only meaningful for the kind it
    // was picked under, so it doesn't carry over to a different kind.
    setDraftTypeId("");
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePhotoTagsAction(photoId, {
        kind: draftKind,
        brandId: draftKind === "outlet" ? null : draftBrandId || null,
        shopTypeId: draftKind === "outlet" ? null : draftShopTypeId || null,
        categoryId: draftKind === "category" ? draftTypeId || null : null,
        posmTypeId: draftKind === "posm" ? draftTypeId || null : null,
        skuTypeId: draftKind === "sku" ? draftTypeId || null : null,
        isGoodExecution: draftIsGood,
      });
      if (result.ok) {
        setEditing(false);
      } else {
        setError(result.message);
      }
    });
  };

  const activeTypeOptions = draftKind === "posm" ? posmTypes : draftKind === "category" ? categories : skuTypes;

  if (!editing) {
    return (
      <>
        <td className="px-3 py-2 whitespace-nowrap">{KIND_LABELS[kind]}</td>
        <td className="px-3 py-2">{outletName ?? "-"}</td>
        <td className="px-3 py-2">{brandName ?? "-"}</td>
        <td className="px-3 py-2">{kind === "outlet" ? "-" : (typeName ?? "-")}</td>
        <td className="px-3 py-2">{shopTypeName ?? "-"}</td>
        <td className="px-3 py-2">
          {kind === "outlet" ? (
            "-"
          ) : (
            <span className={isGoodExecution ? "text-green-600" : "text-red-600"}>
              {isGoodExecution ? "Good" : "Bad"}
            </span>
          )}
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
          value={draftKind}
          onChange={(e) => changeDraftKind(e.target.value as PhotoKind)}
          className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          {PHOTO_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">{outletName ?? "-"}</td>
      <td className="px-3 py-2">
        {draftKind === "outlet" ? (
          "-"
        ) : (
          <select
            value={draftBrandId}
            onChange={(e) => setDraftBrandId(e.target.value)}
            className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">Select brand…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-2">
        {draftKind === "outlet" ? (
          "-"
        ) : (
          <select
            value={draftTypeId}
            onChange={(e) => setDraftTypeId(e.target.value)}
            className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">-</option>
            {activeTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-2">
        {draftKind === "outlet" ? (
          "-"
        ) : (
          <select
            value={draftShopTypeId}
            onChange={(e) => setDraftShopTypeId(e.target.value)}
            className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">Select shop type…</option>
            {shopTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-2">
        {draftKind === "outlet" ? (
          "-"
        ) : (
          <select
            value={draftIsGood ? "good" : "bad"}
            onChange={(e) => setDraftIsGood(e.target.value === "good")}
            className="rounded border border-gray-300 px-1 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="good">Good</option>
            <option value="bad">Bad</option>
          </select>
        )}
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
