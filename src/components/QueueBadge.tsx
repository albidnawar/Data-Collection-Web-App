"use client";

import Link from "next/link";
import { usePendingQueue } from "@/hooks/usePendingQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function QueueBadge() {
  const { pendingCount } = usePendingQueue();
  const online = useOnlineStatus();

  return (
    <Link
      href="/queue"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${online ? "bg-green-500" : "bg-amber-500"}`} />
      {pendingCount > 0 ? `${pendingCount} pending` : "Synced"}
    </Link>
  );
}
