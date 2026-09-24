import Link from "next/link";
import { auth } from "@/auth";
import { QueueBadge } from "@/components/QueueBadge";
import { SyncManager } from "@/components/SyncManager";
import { logoutAction } from "./actions";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <SyncManager />
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Fieldlenz
        </Link>
        <div className="flex items-center gap-3">
          <QueueBadge />
          {session?.user?.isAdmin && (
            <Link
              href="/admin"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Admin
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
