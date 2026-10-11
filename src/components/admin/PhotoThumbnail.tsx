"use client";

import { useState } from "react";

export function PhotoThumbnail({ photoId, hasFile }: { photoId: string; hasFile: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!hasFile || failed) {
    return <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/admin/photos/${photoId}/thumbnail`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-10 w-10 rounded object-cover"
    />
  );
}
