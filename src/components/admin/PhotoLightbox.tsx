"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createCroppedPhotoAction, updatePhotoTagsAction } from "@/app/admin/photos/actions";
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
  // Whether the rep who captured this photo has the "pran" role — only then
  // does the crop tool need to ask Pran vs Competitor for the split-out photo.
  repIsPranRole: boolean;
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
  // Tracked by id rather than array index — creating a new photo from a crop
  // (or any edit that changes a row's sort position) refreshes this `photos`
  // array in place, and an index could silently end up pointing at a
  // different photo than the one actually open.
  const [currentId, setCurrentId] = useState<string | null>(null);

  const openPhoto = useCallback((id: string) => setCurrentId(id), []);
  const close = useCallback(() => setCurrentId(null), []);

  const step = useCallback(
    (delta: 1 | -1) => {
      setCurrentId((id) => {
        if (id === null || photos.length === 0) return id;
        const i = photos.findIndex((p) => p.id === id);
        const base = i === -1 ? 0 : i;
        return photos[(base + delta + photos.length) % photos.length].id;
      });
    },
    [photos],
  );
  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  // Lets the edit panel know, before it saves, which photo it'll land on
  // afterwards — saving triggers a revalidation that can drop the just-edited
  // photo out of this `photos` array entirely (e.g. it no longer matches an
  // active filter), so recomputing this from the post-save array could jump
  // somewhere unexpected or close the lightbox. Peeking now and jumping there
  // directly (via goTo) sidesteps that. Steps backward (same direction as
  // "‹ Previous") per how admins actually flip through the tray after saving.
  const peekNextId = useCallback(() => {
    if (currentId === null || photos.length === 0) return null;
    const i = photos.findIndex((p) => p.id === currentId);
    const base = i === -1 ? 0 : i;
    return photos[(base - 1 + photos.length) % photos.length].id;
  }, [photos, currentId]);
  const goTo = useCallback((id: string) => setCurrentId(id), []);

  useEffect(() => {
    if (currentId === null) return;
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
  }, [currentId, close, prev, next]);

  const current = currentId !== null ? (photos.find((p) => p.id === currentId) ?? null) : null;
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
              peekNextId={peekNextId}
              goTo={goTo}
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

type ProductKind = Exclude<PhotoKind, "outlet">;

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
  peekNextId,
  goTo,
}: {
  photo: EditablePhotoRef;
  options: PhotoEditOptions;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  peekNextId: () => string | null;
  goTo: (id: string) => void;
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

  // --- Crop tool: split one more brand's display, elsewhere in this same
  // photo, out into its own independent photo record. ---
  const imgRef = useRef<HTMLImageElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropKind, setCropKind] = useState<ProductKind>(photo.kind === "outlet" ? "category" : photo.kind);
  const [cropBrandId, setCropBrandId] = useState("");
  const [cropTypeId, setCropTypeId] = useState("");
  const [cropShopTypeId, setCropShopTypeId] = useState(photo.shopTypeId ?? "");
  const [cropIsGood, setCropIsGood] = useState(photo.isGoodExecution);
  const [cropPranRelation, setCropPranRelation] = useState(photo.repIsPranRole ? "competitor" : "");
  const [cropPending, setCropPending] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropSaved, setCropSaved] = useState(false);

  const changeDraftKind = (nextKind: PhotoKind) => {
    setDraftKind(nextKind);
    setDraftTypeId("");
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    setPending(true);
    // Computed up front — saving revalidates the page's data, which can drop
    // this photo out of the tray (e.g. it no longer matches an active
    // filter), so this can't be recomputed from the array afterward.
    const nextId = peekNextId();
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
      if (nextId && nextId !== photo.id) goTo(nextId);
    } else {
      setError(result.message);
    }
  };

  const activeTypeOptions =
    draftKind === "posm" ? options.posmTypes : draftKind === "category" ? options.categories : options.skuTypes;

  const changeCropKind = (nextKind: ProductKind) => {
    setCropKind(nextKind);
    setCropTypeId("");
  };

  const cropTypeOptions =
    cropKind === "posm" ? options.posmTypes : cropKind === "category" ? options.categories : options.skuTypes;

  const localPoint = (clientX: number, clientY: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.min(Math.max(clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(clientY - rect.top, 0), rect.height),
    };
  };

  const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = localPoint(e.clientX, e.clientY);
    dragOriginRef.current = p;
    setCropRect({ x: p.x, y: p.y, w: 0, h: 0 });
    setCropSaved(false);
    setCropError(null);
  };
  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const p = localPoint(e.clientX, e.clientY);
    setCropRect({
      x: Math.min(origin.x, p.x),
      y: Math.min(origin.y, p.y),
      w: Math.abs(p.x - origin.x),
      h: Math.abs(p.y - origin.y),
    });
  };
  const onOverlayPointerUp = () => {
    dragOriginRef.current = null;
  };

  const createCropped = async () => {
    setCropError(null);
    setCropSaved(false);

    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) {
      setCropError("Drag a box over the other brand's display first.");
      return;
    }
    if (!cropBrandId || !cropShopTypeId || !cropTypeId) {
      setCropError("Choose a brand, type, and shop type for the new photo.");
      return;
    }
    const img = imgRef.current;
    if (!img) return;

    setCropPending(true);
    try {
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const sx = Math.round(cropRect.x * scaleX);
      const sy = Math.round(cropRect.y * scaleY);
      const sw = Math.round(cropRect.w * scaleX);
      const sh = Math.round(cropRect.h * scaleY);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Couldn't read the cropped image.");

      const formData = new FormData();
      formData.set("sourcePhotoId", photo.id);
      formData.set("photo", blob, "crop.jpg");
      formData.set("kind", cropKind);
      formData.set("brandId", cropBrandId);
      formData.set("shopTypeId", cropShopTypeId);
      if (cropKind === "category") formData.set("categoryId", cropTypeId);
      if (cropKind === "posm") formData.set("posmTypeId", cropTypeId);
      if (cropKind === "sku") formData.set("skuTypeId", cropTypeId);
      formData.set("isGoodExecution", String(cropIsGood));
      if (cropPranRelation) formData.set("pranRelation", cropPranRelation);

      const result = await createCroppedPhotoAction(formData);
      if (result.ok) {
        setCropSaved(true);
        setCropRect(null);
        setCropBrandId("");
        setCropTypeId("");
      } else {
        setCropError(result.message);
      }
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Couldn't create the new photo.");
    } finally {
      setCropPending(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex flex-1 items-center justify-center p-4">
        {!cropMode && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous photo"
            className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 md:left-4"
          >
            ‹
          </button>
        )}
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`/api/admin/photos/${photo.id}/image`}
            alt={photo.filename}
            className="max-h-[50vh] max-w-full rounded object-contain md:max-h-[90vh]"
          />
          {cropMode && (
            <div
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
            >
              {cropRect && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20"
                  style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                />
              )}
            </div>
          )}
        </div>
        {!cropMode && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next photo"
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 md:right-4"
          >
            ›
          </button>
        )}
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

        <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
          {!cropMode ? (
            <button
              type="button"
              onClick={() => setCropMode(true)}
              className="self-start text-sm font-medium text-blue-600"
            >
              Split out another brand from this photo…
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                  Drag a box over the other brand&apos;s display
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCropMode(false);
                    setCropRect(null);
                    setCropError(null);
                  }}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                This saves the selection as a brand-new photo — the outlet, time, and location come from this
                photo, which stays exactly as it is.
              </p>

              <label className={labelClass}>
                Kind
                <select value={cropKind} onChange={(e) => changeCropKind(e.target.value as ProductKind)} className={selectClass}>
                  <option value="posm">POSM</option>
                  <option value="category">Category Shelf Display</option>
                  <option value="sku">SKU</option>
                </select>
              </label>

              <label className={labelClass}>
                Brand
                <select value={cropBrandId} onChange={(e) => setCropBrandId(e.target.value)} className={selectClass}>
                  <option value="">Select brand…</option>
                  {options.brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Type
                <select value={cropTypeId} onChange={(e) => setCropTypeId(e.target.value)} className={selectClass}>
                  <option value="">-</option>
                  {cropTypeOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Shop type
                <select value={cropShopTypeId} onChange={(e) => setCropShopTypeId(e.target.value)} className={selectClass}>
                  <option value="">Select shop type…</option>
                  {options.shopTypes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Execution
                <select
                  value={cropIsGood ? "good" : "bad"}
                  onChange={(e) => setCropIsGood(e.target.value === "good")}
                  className={selectClass}
                >
                  <option value="good">Good</option>
                  <option value="bad">Bad</option>
                </select>
              </label>

              {photo.repIsPranRole && (
                <label className={labelClass}>
                  Pran / Competitor
                  <select
                    value={cropPranRelation}
                    onChange={(e) => setCropPranRelation(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-</option>
                    <option value="pran">Pran</option>
                    <option value="competitor">Competitor</option>
                  </select>
                </label>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cropPending}
                  onClick={() => void createCropped()}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {cropPending ? "Creating…" : "Create new photo"}
                </button>
                {cropSaved && <span className="text-xs font-medium text-green-600">Created — draw another</span>}
                {cropError && <span className="text-xs font-medium text-red-600">{cropError}</span>}
              </div>
            </div>
          )}
        </div>

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
