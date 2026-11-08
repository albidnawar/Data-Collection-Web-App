"use client";

import { useState } from "react";
import { usePhotoLightbox } from "@/components/admin/PhotoLightbox";

export function PhotoThumbnail({ photoId, hasFile }: { photoId: string; hasFile: boolean }) {
  const [failed, setFailed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const { openPhoto } = usePhotoLightbox();

  if (!hasFile || failed) {
    return <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openPhoto(photoId)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="block cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/photos/${photoId}/thumbnail`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-10 w-10 rounded object-cover hover:opacity-80"
        />
      </button>
      {hovering && (
        // pointer-events-none so this overlay never steals the hover target
        // from the thumbnail above - otherwise the browser would route the
        // mouseleave to this element instead and the preview would vanish
        // the instant it appears.
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/photos/${photoId}/image`}
            alt=""
            className="max-h-[85vh] max-w-[85vw] rounded object-contain"
          />
        </div>
      )}
    </>
  );
}
