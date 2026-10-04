import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OverviewContent } from "@/components/admin/OverviewContent";
import { OverviewPasswordGate } from "@/components/OverviewPasswordGate";
import { OVERVIEW_COOKIE, expectedOverviewCookieValue } from "@/lib/overviewAuth";

export const dynamic = "force-dynamic";

export default async function PublicOverviewPage() {
  if (!process.env.PUBLIC_OVERVIEW_PASSWORD) {
    notFound();
  }

  const store = await cookies();
  const unlocked = store.get(OVERVIEW_COOKIE)?.value === expectedOverviewCookieValue();

  if (!unlocked) {
    return <OverviewPasswordGate />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-blue.png" alt="" className="h-6 w-6" />
          CamTag — Production Overview
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">Read-only, updates live</span>
      </header>
      <main className="flex-1 p-4">
        <OverviewContent isPublic />
      </main>
    </div>
  );
}
