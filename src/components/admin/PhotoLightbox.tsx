"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface PhotoRef {
  id: string;
  filename: string;
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

export function PhotoLightboxProvider({ photos, children }: { photos: PhotoRef[]; children: React.ReactNode }) {
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
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, prev, next]);

  const current = index !== null ? photos[index] : null;

  return (
    <LightboxContext.Provider value={{ openPhoto }}>
      {children}
      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
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
    </LightboxContext.Provider>
  );
}
