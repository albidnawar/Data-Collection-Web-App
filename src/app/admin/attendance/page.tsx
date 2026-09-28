import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildAttendanceWhere } from "@/lib/adminAttendanceFilters";
import { LocalDateTime } from "@/components/admin/LocalDateTime";

const PAGE_SIZE = 50;

export default async function AdminAttendancePage(props: PageProps<"/admin/attendance">) {
  const sp = await props.searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    repId: get("repId"),
  };
  const page = Math.max(1, Number(get("page") ?? "1") || 1);

  const where = buildAttendanceWhere(filters);

  const [reps, total, records] = await Promise.all([
    prisma.rep.findMany({ orderBy: { name: "asc" } }),
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { dateKey: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { rep: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (extra: Record<string, string> = {}) =>
    new URLSearchParams(
      Object.entries({ ...filters, ...extra }).filter(([, v]) => v) as [string, string][],
    ).toString();

  const csvQuery = buildQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance log</h1>
        <a
          href={`/api/admin/attendance?format=csv&${csvQuery}`}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          From
          <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          To
          <input type="date" name="dateTo" defaultValue={filters.dateTo} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Rep
          <select name="repId" defaultValue={filters.repId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="self-end rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Clock in</th>
              <th className="px-3 py-2">Clock-in location</th>
              <th className="px-3 py-2">Selfie</th>
              <th className="px-3 py-2">Clock out</th>
              <th className="px-3 py-2">Clock-out location</th>
              <th className="px-3 py-2">Selfie</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 whitespace-nowrap">{r.dateKey}</td>
                <td className="px-3 py-2">{r.rep.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <LocalDateTime iso={r.clockInAt.toISOString()} />
                </td>
                <td className="px-3 py-2">{r.clockInAddress ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.clockInPhotoUrl ? (
                    <a href={r.clockInPhotoUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.clockOutAt ? <LocalDateTime iso={r.clockOutAt.toISOString()} /> : "—"}
                </td>
                <td className="px-3 py-2">{r.clockOutAddress ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.clockOutPhotoUrl ? (
                    <a href={r.clockOutPhotoUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No attendance records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {total} result{total === 1 ? "" : "s"} — page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`?${buildQuery({ page: String(page - 1) })}`} className="text-blue-600">
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link href={`?${buildQuery({ page: String(page + 1) })}`} className="text-blue-600">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
