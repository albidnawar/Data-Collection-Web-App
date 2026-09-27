"use client";

import { useRef, useState } from "react";
import { ChipGroup } from "@/components/ChipGroup";
import { TagKindToggle } from "@/components/TagKindToggle";
import { useTagCache } from "@/hooks/useTagCache";
import { notifyQueueChanged } from "@/hooks/usePendingQueue";
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

  const [brand, setBrand] = useState<string | null>(null);
  const [isPosm, setIsPosm] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [posmType, setPosmType] = useState<string | null>(null);
  const [shopType, setShopType] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

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
  };

  const handleAddNewTag = async (type: TagType, name: string) => {
    await addLocalTag(type, name);
  };

  const canSave =
    photo !== null &&
    brand !== null &&
    shopType !== null &&
    (isPosm ? posmType !== null : category !== null);

  const handleSave = async () => {
    if (!canSave || !photo || !capturedAt || !brand || !shopType) return;

    const tagRef = (name: string): TagRef => ({ id: null, name });

    await addPendingUpload({
      clientQueueId: crypto.randomUUID(),
      photoBlob: photo,
      brand: tagRef(brand),
      isPosm,
      category: !isPosm && category ? tagRef(category) : null,
      posmType: isPosm && posmType ? tagRef(posmType) : null,
      shopType: tagRef(shopType),
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
    setCategory(null);
    setPosmType(null);
    setIsPosm(false);
    // Smart defaults: brand and shop type carry forward since reps usually
    // shoot several photos of the same brand/shop in a row.
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

      {compressing ? (
        <div className="flex aspect-[4/3] max-h-[45vh] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white">
          <span className="text-2xl">📷</span>
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
          <span className="text-2xl">📷</span>
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

      {saveMessage && (
        <p className="text-center text-sm font-medium text-green-600">{saveMessage}</p>
      )}

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        Save & Next Photo
      </button>
    </div>
  );
}
