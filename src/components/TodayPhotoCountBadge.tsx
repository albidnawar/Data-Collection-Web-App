"use client";

import { Camera } from "lucide-react";
import { useTodayPhotoCount } from "@/hooks/useTodayPhotoCount";

export function TodayPhotoCountBadge() {
  const count = useTodayPhotoCount();

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
      <Camera className="size-3.5" strokeWidth={2} />
      {count === null ? "…" : count} today
    </span>
  );
}
