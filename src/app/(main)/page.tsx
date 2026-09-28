"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { ChipGroup } from "@/components/ChipGroup";
import { ExecutionQualityToggle } from "@/components/ExecutionQualityToggle";
import { TagKindToggle } from "@/components/TagKindToggle";
import { useTagCache } from "@/hooks/useTagCache";
import { notifyQueueChanged } from "@/hooks/usePendingQueue";
import { getCurrentPositionDetailed, getLocationHelp } from "@/lib/geolocation";
import { formatRawCoords } from "@/lib/geocoding";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { addPendingUpload, type TagRef } from "@/lib/indexedDb";
import { recordTagUse, sortByMostRecentlyUsed } from "@/lib/recentTags";
import { drainUploadQueue } from "@/lib/syncQueue";
import type { TagType } from "@/lib/tagTypes";

export default function CapturePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { cache, addLocalTag } = useTagCache();

  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  const [brand, setBrand] = useState<string | null>(null);
  const [isPosm, setIsPosm] = useState(false);
  const [isGoodExecution, setIsGoodExecution] = useState<boolean | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [posmType, setPosmType] = useState<string | null>(null);
  const [shopType, setShopType] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const requestLocation = async () => {
    setLocatingGps(true);
    const outcome = await getCurrentPositionDetailed();
    setLocatingGps(false);
    setLocationBlocked(outcome.status === "denied");
    setLocationUnavailable(outcome.status === "unavailable");
    if (outcome.status === "success") setGps(outcome.result);
    return outcome;
  };

  // Ask for location right away, on the first screen the rep sees — so the native
  // "Allow location?" prompt shows up immediately instead of only after they've
  // already taken a photo (and is easy to find if they need to fix it manually).
  // Geolocation is a client-only browser API that can only run post-mount, and its
  // result can only be known asynchronously — there's no way to derive this from
  // props/state during render, so updating state once it resolves is unavoidable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestLocation();
  }, []);

  const handleTakePhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setCapturedAt(new Date());
    setSaveMessage(null);

    setCompressing(true);
    const file = await compressImageIfNeeded(rawFile);
    setCompressing(false);

    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));

    void requestLocation();
  };

  const handleAddNewTag = async (type: TagType, name: string) => {
    await addLocalTag(type, name);
  };

  const canSave =
    photo !== null &&
    !locatingGps &&
    brand !== null &&
    shopType !== null &&
    isGoodExecution !== null &&
    (isPosm ? posmType !== null : category !== null);

  const handleSave = async () => {
    if (!canSave || !photo || !capturedAt || !brand || !shopType || isGoodExecution === null) return;

    const tagRef = (name: string): TagRef => ({ id: null, name });

    await addPendingUpload({
      clientQueueId: crypto.randomUUID(),
      photoBlob: photo,
      brand: tagRef(brand),
      isPosm,
      isGoodExecution,
      category: !isPosm && category ? tagRef(category) : null,
      posmType: isPosm && posmType ? tagRef(posmType) : null,
      shopType: tagRef(shopType),
      gpsLat: gps?.lat ?? null,
      gpsLng: gps?.lng ?? null,
      address: gps ? formatRawCoords(gps.lat, gps.lng) : null,
      capturedAt: capturedAt.toISOString(),
      status: "queued",
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
    });

    recordTagUse("brand", brand);
    recordTagUse("shopType", shopType);
    if (isPosm && posmType) recordTagUse("posmType", posmType);
    if (!isPosm && category) recordTagUse("category", category);

    notifyQueueChanged();
    void drainUploadQueue();

    setSaveMessage("Saved — queued for upload.");

    setPhoto(null);
    setPreviewUrl(null);
    setCapturedAt(null);
    setGps(null);
    setCategory(null);
    setPosmType(null);
    setIsPosm(false);
    setIsGoodExecution(null);
    // Smart defaults: brand and shop type carry forward since reps usually
    // shoot several photos of the same brand/shop in a row. Location is always
    // re-detected fresh per photo, never carried over. Execution quality is
    // also never carried over — it needs a conscious choice every time.
  };

  const brandOptions = cache ? sortByMostRecentlyUsed("brand", cache.brands) : [];
  const categoryOptions = cache ? sortByMostRecentlyUsed("category", cache.categories) : [];
  const posmTypeOptions = cache ? sortByMostRecentlyUsed("posmType", cache.posmTypes) : [];
  const shopTypeOptions = cache ? sortByMostRecentlyUsed("shopType", cache.shopTypes) : [];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {locationBlocked && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            Location access is off — photos won&apos;t record where they were taken until it&apos;s turned back on.
          </p>
          <p className="font-medium text-amber-800 dark:text-amber-200">{getLocationHelp().title}:</p>
          <ol className="list-decimal space-y-1 pl-5 text-amber-800 dark:text-amber-200">
            {getLocationHelp().steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => void requestLocation()}
            className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            I&apos;ve done this — try again
          </button>
        </div>
      )}

      {compressing ? (
        <div className="flex aspect-[4/3] max-h-[45vh] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white">
          <Camera className="size-8" strokeWidth={1.75} />
          <span className="text-lg font-semibold">Processing photo…</span>
        </div>
      ) : previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Captured"
          className="aspect-[4/3] max-h-[45vh] w-full rounded-2xl object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={handleTakePhoto}
          className="flex aspect-[4/3] max-h-[45vh] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white active:bg-blue-700"
        >
          <Camera className="size-8" strokeWidth={1.75} />
          <span className="text-lg font-semibold">Take Photo</span>
        </button>
      )}

      {previewUrl && (
        <button
          type="button"
          onClick={handleTakePhoto}
          className="rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          Retake photo
        </button>
      )}

      <ChipGroup
        label="Brand"
        options={brandOptions}
        selected={brand}
        onSelect={setBrand}
        onAddNew={(name) => handleAddNewTag("brand", name)}
      />

      <ExecutionQualityToggle isGoodExecution={isGoodExecution} onChange={setIsGoodExecution} />

      <TagKindToggle isPosm={isPosm} onChange={setIsPosm} />

      {isPosm ? (
        <ChipGroup
          label="POSM Type"
          options={posmTypeOptions}
          selected={posmType}
          onSelect={setPosmType}
          onAddNew={(name) => handleAddNewTag("posmType", name)}
        />
      ) : (
        <ChipGroup
          label="Category Shelf Display Type"
          options={categoryOptions}
          selected={category}
          onSelect={setCategory}
          onAddNew={(name) => handleAddNewTag("category", name)}
        />
      )}

      <ChipGroup
        label="Shop Type"
        options={shopTypeOptions}
        selected={shopType}
        onSelect={setShopType}
        onAddNew={(name) => handleAddNewTag("shopType", name)}
      />

      {locationUnavailable && !locationBlocked && !locatingGps && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Couldn&apos;t get a GPS fix for this photo (common indoors) — it will save without a location.
        </p>
      )}

      {saveMessage && (
        <p className="text-center text-sm font-medium text-green-600">{saveMessage}</p>
      )}

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {locatingGps ? "Locating…" : "Save & Next Photo"}
      </button>
    </div>
  );
}
