import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTodayAttendance } from "@/lib/attendance";
import { QueueBadge } from "@/components/QueueBadge";
import { TodayPhotoCountBadge } from "@/components/TodayPhotoCountBadge";
import { SyncManager } from "@/components/SyncManager";
import { logoutAction } from "./actions";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const attendance = session?.user ? await getTodayAttendance(session.user.id) : null;
  const attendanceGateDisabled = process.env.DISABLE_ATTENDANCE_GATE === "true";

  if (session?.user && !attendance && !attendanceGateDisabled) {
    redirect("/attendance");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <SyncManager />
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-blue.png" alt="" className="h-6 w-6" />
          CamTag
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5 sm:gap-x-3">
          <TodayPhotoCountBadge />
          <QueueBadge />
          {attendance && !attendance.clockOutAt && (
            <Link href="/attendance" className="text-sm font-medium whitespace-nowrap text-gray-600 dark:text-gray-400">
              End Day
            </Link>
          )}
          {session?.user?.isAdmin && (
            <Link
              href="/admin"
              className="text-sm font-medium whitespace-nowrap text-gray-600 dark:text-gray-400"
            >
              Admin
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
