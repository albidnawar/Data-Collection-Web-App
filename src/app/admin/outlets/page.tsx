import Link from "next/link";
import { prisma } from "@/lib/db";
import { OutletCsvUploadForm } from "@/components/admin/OutletCsvUploadForm";
import { DeleteOutletButton } from "@/components/admin/DeleteOutletButton";
import { toggleOutletActiveAction } from "./actions";

const PAGE_SIZE = 50;

export default async function AdminOutletsPage(props: PageProps<"/admin/outlets">) {
  const sp = await props.searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const brandId = get("brandId");
  const page = Math.max(1, Number(get("page") ?? "1") || 1);

  const where = brandId ? { brandId } : {};

  const [brands, total, outlets] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.outlet.count({ where }),
    prisma.outlet.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { brand: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (extra: Record<string, string> = {}) =>
    new URLSearchParams(
      Object.entries({ brandId, ...extra }).filter(([, v]) => v) as [string, string][],
    ).toString();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Outlets</h1>

      <OutletCsvUploadForm brands={brands} />

      <form method="get" className="flex items-center gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Brand
          <select name="brandId" defaultValue={brandId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
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
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Town</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Lat</th>
              <th className="px-3 py-2">Lng</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {outlets.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2">{o.code}</td>
                <td className="px-3 py-2">{o.town}</td>
                <td className="px-3 py-2">{o.brand.name}</td>
                <td className="px-3 py-2">{o.lat}</td>
                <td className="px-3 py-2">{o.lng}</td>
                <td className="px-3 py-2">
                  <form action={toggleOutletActiveAction.bind(null, o.id, !o.active)}>
                    <button type="submit" className={`text-xs font-medium ${o.active ? "text-green-600" : "text-gray-400"}`}>
                      {o.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <DeleteOutletButton id={o.id} />
                </td>
              </tr>
            ))}
            {outlets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No outlets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {total} result{total === 1 ? "" : "s"}, page {page} of {totalPages}
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
