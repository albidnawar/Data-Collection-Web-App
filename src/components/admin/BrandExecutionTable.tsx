import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import type { PhotoKind } from "@/lib/tagTypes";

export async function BrandExecutionTable({ kind, title }: { kind: PhotoKind; title: string }) {
  const rows = await prisma.photoRecord.groupBy({
    by: ["brandId", "isGoodExecution"],
    where: { status: "uploaded", kind },
    _count: { _all: true },
  });

  const brands = await prisma.brand.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.brandId))] } },
  });

  const byBrand = new Map<string, { name: string; good: number; bad: number }>();
  for (const row of rows) {
    const name = brands.find((b) => b.id === row.brandId)?.name ?? "Unknown";
    const entry = byBrand.get(row.brandId) ?? { name, good: 0, bad: 0 };
    if (row.isGoodExecution) entry.good += row._count._all;
    else entry.bad += row._count._all;
    byBrand.set(row.brandId, entry);
  }

  const breakdown = [...byBrand.values()]
    .map((b) => ({ ...b, total: b.good + b.bad }))
    .sort((a, b) => b.total - a.total);

  const totalGood = breakdown.reduce((sum, b) => sum + b.good, 0);
  const totalBad = breakdown.reduce((sum, b) => sum + b.bad, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        <Link href={`/admin/photos?kind=${kind}`} className="text-sm font-medium text-blue-600">
          View all photos
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Good executions" value={totalGood} />
        <StatCard label="Bad executions" value={totalBad} tone={totalBad > 0 ? "warning" : "default"} />
        <StatCard label="Total" value={totalGood + totalBad} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
            <tr>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2 text-right">Good</th>
              <th className="px-3 py-2 text-right">Bad</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No {title.toLowerCase()} photos yet.
                </td>
              </tr>
            )}
            {breakdown.map((b) => (
              <tr key={b.name} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{b.name}</td>
                <td className="px-3 py-2 text-right font-medium text-green-600">{b.good}</td>
                <td className="px-3 py-2 text-right font-medium text-red-600">{b.bad}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
