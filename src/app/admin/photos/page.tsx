import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildPhotoWhere } from "@/lib/adminPhotoFilters";

const PAGE_SIZE = 50;

export default async function AdminPhotosPage(props: PageProps<"/admin/photos">) {
  const sp = await props.searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    repId: get("repId"),
    brandId: get("brandId"),
    shopTypeId: get("shopTypeId"),
    isPosm: get("isPosm"),
    status: get("status"),
  };
  const page = Math.max(1, Number(get("page") ?? "1") || 1);

  const where = buildPhotoWhere(filters);

  const [reps, brands, shopTypes, total, records] = await Promise.all([
    prisma.rep.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.shopType.findMany({ orderBy: { name: "asc" } }),
    prisma.photoRecord.count({ where }),
    prisma.photoRecord.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { rep: true, brand: true, category: true, posmType: true, shopType: true },
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
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Photo log</h1>
        <a
          href={`/api/admin/photos?format=csv&${csvQuery}`}
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
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Brand
          <select name="brandId" defaultValue={filters.brandId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Shop type
          <select name="shopTypeId" defaultValue={filters.shopTypeId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {shopTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          POSM
          <select name="isPosm" defaultValue={filters.isPosm ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            <option value="uploaded">Uploaded</option>
            <option value="pending">Pending</option>
            <option value="uploading">Uploading</option>
            <option value="failed">Failed</option>
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
              <th className="px-3 py-2">Captured</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">POSM</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Shop type</th>
              <th className="px-3 py-2">Shop name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Drive</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 whitespace-nowrap">{r.capturedAt.toLocaleString()}</td>
                <td className="px-3 py-2">{r.rep.name}</td>
                <td className="px-3 py-2">{r.brand.name}</td>
                <td className="px-3 py-2">{r.isPosm ? r.posmType?.name ?? "Yes" : "No"}</td>
                <td className="px-3 py-2">{r.category.name}</td>
                <td className="px-3 py-2">{r.shopType.name}</td>
                <td className="px-3 py-2">{r.shopName}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      r.status === "uploaded"
                        ? "text-green-600"
                        : r.status === "failed"
                          ? "text-red-600"
                          : "text-amber-600"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.driveFileUrl ? (
                    <a href={r.driveFileUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  No photos match these filters.
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
