"use client";

import { useState } from "react";
import { usePhotoLightbox } from "@/components/admin/PhotoLightbox";

export function PhotoThumbnail({ photoId, hasFile }: { photoId: string; hasFile: boolean }) {
  const [failed, setFailed] = useState(false);
  const { openPhoto } = usePhotoLightbox();

  if (!hasFile || failed) {
    return <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800" />;
  }

  return (
    <button type="button" onClick={() => openPhoto(photoId)} className="block cursor-zoom-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/admin/photos/${photoId}/thumbnail`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-10 w-10 rounded object-cover hover:opacity-80"
      />
    </button>
  );
}
