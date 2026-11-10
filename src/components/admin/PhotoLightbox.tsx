"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { updatePhotoTagsAction } from "@/app/admin/photos/actions";
import { PHOTO_KINDS, type PhotoKind } from "@/lib/tagTypes";

interface PhotoRef {
  id: string;
  filename: string;
}

// Present only on pages that opt into in-panel editing (currently the Photo
// log) — the Pran module still opens photos in plain view-only mode, passing
// just `PhotoRef`s.
export interface EditablePhotoRef extends PhotoRef {
  kind: PhotoKind;
  outletName: string | null;
  brandId: string | null;
  brandName: string | null;
  typeId: string | null;
  typeName: string | null;
  shopTypeId: string | null;
  shopTypeName: string | null;
  isGoodExecution: boolean;
  shelfVacancy: boolean | null;
  surroundingRemarks: string | null;
  otherRemarks: string | null;
}

interface Option {
  id: string;
  name: string;
}

export interface PhotoEditOptions {
  brands: Option[];
  shopTypes: Option[];
  categories: Option[];
  posmTypes: Option[];
  skuTypes: Option[];
}

function isEditableRef(photo: PhotoRef | EditablePhotoRef): photo is EditablePhotoRef {
  return "kind" in photo;
}

interface LightboxContextValue {
  openPhoto: (id: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function usePhotoLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("usePhotoLightbox must be used within a PhotoLightboxProvider");
  return ctx;
}

export function PhotoLightboxProvider({
  photos,
  editOptions,
  children,
}: {
  photos: (PhotoRef | EditablePhotoRef)[];
  editOptions?: PhotoEditOptions;
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);

  const openPhoto = useCallback(
    (id: string) => {
      const i = photos.findIndex((p) => p.id === id);
      if (i !== -1) setIndex(i);
    },
    [photos],
  );

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => {
    setIndex((i) => (i === null || photos.length === 0 ? i : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const next = useCallback(() => {
    setIndex((i) => (i === null || photos.length === 0 ? i : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack arrow keys / Escape while the rep is typing in one of
      // the edit panel's own fields (e.g. moving a cursor inside a remarks
      // textarea shouldn't jump to the next photo).
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, prev, next]);

  const current = index !== null ? photos[index] : null;
  const showEditPanel = current !== null && editOptions !== undefined && isEditableRef(current);

  return (
    <LightboxContext.Provider value={{ openPhoto }}>
      {children}
      {current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={close}>
          {showEditPanel ? (
            <PhotoEditPanel
              key={current.id}
              photo={current}
              options={editOptions}
              onPrev={prev}
              onNext={next}
              onClose={close}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-4">
              <div
                className="mb-3 max-w-full truncate px-4 text-center text-sm font-medium text-white"
                onClick={(e) => e.stopPropagation()}
              >
                {current.filename}
              </div>
              <div
                className="relative flex w-full max-w-4xl flex-1 items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous photo"
                  className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
                >
                  ‹
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={current.id}
                  src={`/api/admin/photos/${current.id}/image`}
                  alt={current.filename}
                  className="max-h-[80vh] max-w-full rounded object-contain"
                />
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next photo"
                  className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
                >
                  ›
                </button>
              </div>
              <button
                type="button"
                onClick={close}
                className="mt-3 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </LightboxContext.Provider>
  );
}

const KIND_LABELS: Record<PhotoKind, string> = {
  posm: "POSM",
  category: "Category Shelf Display",
  sku: "SKU",
  outlet: "Outlet",
};

const selectClass =
  "w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const textareaClass = selectClass;
const labelClass = "flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400";

/** The right-hand editor shown alongside the image — lets an admin flip
 * through photos with the prev/next buttons (or arrow keys) and fix each
 * one's details without leaving the lightbox, instead of hunting the row
 * back down in the table underneath. */
function PhotoEditPanel({
  photo,
  options,
  onPrev,
  onNext,
  onClose,
}: {
  photo: EditablePhotoRef;
  options: PhotoEditOptions;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [draftKind, setDraftKind] = useState<PhotoKind>(photo.kind);
  const [draftBrandId, setDraftBrandId] = useState(photo.brandId ?? "");
  const [draftTypeId, setDraftTypeId] = useState(photo.typeId ?? "");
  const [draftShopTypeId, setDraftShopTypeId] = useState(photo.shopTypeId ?? "");
  const [draftIsGood, setDraftIsGood] = useState(photo.isGoodExecution);
  const [draftShelfVacancy, setDraftShelfVacancy] = useState(
    photo.shelfVacancy === true ? "yes" : photo.shelfVacancy === false ? "no" : "",
  );
  const [draftSurrounding, setDraftSurrounding] = useState(photo.surroundingRemarks ?? "");
  const [draftOther, setDraftOther] = useState(photo.otherRemarks ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const changeDraftKind = (nextKind: PhotoKind) => {
    setDraftKind(nextKind);
    setDraftTypeId("");
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    setPending(true);
    const result = await updatePhotoTagsAction(photo.id, {
      kind: draftKind,
      brandId: draftKind === "outlet" ? null : draftBrandId || null,
      shopTypeId: draftKind === "outlet" ? null : draftShopTypeId || null,
      categoryId: draftKind === "category" ? draftTypeId || null : null,
      posmTypeId: draftKind === "posm" ? draftTypeId || null : null,
      skuTypeId: draftKind === "sku" ? draftTypeId || null : null,
      isGoodExecution: draftIsGood,
      shelfVacancy: draftShelfVacancy === "yes" ? true : draftShelfVacancy === "no" ? false : null,
      surroundingRemarks: draftSurrounding.trim() || null,
      otherRemarks: draftOther.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setError(result.message);
    }
  };

  const activeTypeOptions =
    draftKind === "posm" ? options.posmTypes : draftKind === "category" ? options.categories : options.skuTypes;

  return (
    <div className="flex h-full w-full flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex flex-1 items-center justify-center p-4">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous photo"
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 md:left-4"
        >
          ‹
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/photos/${photo.id}/image`}
          alt={photo.filename}
          className="max-h-[50vh] max-w-full rounded object-contain md:max-h-[90vh]"
        />
        <button
          type="button"
          onClick={onNext}
          aria-label="Next photo"
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 md:right-4"
        >
          ›
        </button>
      </div>

      <div className="flex w-full flex-col gap-3 overflow-y-auto bg-white p-4 dark:bg-gray-900 md:w-96">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={photo.filename}>
            {photo.filename}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Close
          </button>
        </div>

        {photo.outletName && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Outlet: {photo.outletName}</p>
        )}

        <label className={labelClass}>
          Kind
          <select
            value={draftKind}
            onChange={(e) => changeDraftKind(e.target.value as PhotoKind)}
            className={selectClass}
          >
            {PHOTO_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        {draftKind !== "outlet" && (
          <>
            <label className={labelClass}>
              Brand
              <select value={draftBrandId} onChange={(e) => setDraftBrandId(e.target.value)} className={selectClass}>
                <option value="">Select brand…</option>
                {options.brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Type
              <select value={draftTypeId} onChange={(e) => setDraftTypeId(e.target.value)} className={selectClass}>
                <option value="">-</option>
                {activeTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Shop type
              <select value={draftShopTypeId} onChange={(e) => setDraftShopTypeId(e.target.value)} className={selectClass}>
                <option value="">Select shop type…</option>
                {options.shopTypes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Execution
              <select
                value={draftIsGood ? "good" : "bad"}
                onChange={(e) => setDraftIsGood(e.target.value === "good")}
                className={selectClass}
              >
                <option value="good">Good</option>
                <option value="bad">Bad</option>
              </select>
            </label>
          </>
        )}

        <label className={labelClass}>
          Shelf vacancy
          <select value={draftShelfVacancy} onChange={(e) => setDraftShelfVacancy(e.target.value)} className={selectClass}>
            <option value="">Not recorded</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label className={labelClass}>
          Surrounding remarks
          <textarea
            value={draftSurrounding}
            onChange={(e) => setDraftSurrounding(e.target.value)}
            rows={2}
            className={textareaClass}
          />
        </label>

        <label className={labelClass}>
          Other remarks
          <textarea
            value={draftOther}
            onChange={(e) => setDraftOther(e.target.value)}
            rows={2}
            className={textareaClass}
          />
        </label>

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void save()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
          {error && <span className="text-xs font-medium text-red-600">{error}</span>}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <button type="button" onClick={onPrev} className="text-sm font-medium text-blue-600">
            ‹ Previous
          </button>
          <button type="button" onClick={onNext} className="text-sm font-medium text-blue-600">
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
