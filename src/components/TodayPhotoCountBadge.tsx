"use client";

import { Camera } from "lucide-react";
import { useTodayPhotoCount } from "@/hooks/useTodayPhotoCount";

export function TodayPhotoCountBadge() {
  const count = useTodayPhotoCount();

  return (
    <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
      <Camera className="size-3.5 shrink-0" strokeWidth={2} />
      {count === null ? "…" : count} today
    </span>
  );
}
