import Link from "next/link";
import { logoutAction } from "../(main)/actions";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/reps", label: "Reps" },
  { href: "/admin/tags", label: "Tags" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Fieldlenz Admin
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Back to app
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Log out
            </button>
          </form>
        </div>
      </header>
      <nav className="flex gap-1 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-600 hover:text-blue-600 dark:text-gray-400"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <main className="flex flex-1 flex-col p-4">{children}</main>
    </div>
  );
}
