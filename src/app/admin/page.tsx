import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { UploadsChart, type UploadsChartPoint } from "@/components/admin/UploadsChart";
import Link from "next/link";

function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export default async function AdminOverviewPage() {
  const [
    totalToday,
    totalWeek,
    totalAllTime,
    pendingOrFailedCount,
    activeRepsCount,
    topBrandsRaw,
    topShopTypesRaw,
    dailyRaw,
    failedRecent,
  ] = await Promise.all([
    prisma.photoRecord.count({ where: { status: "uploaded", uploadedAt: { gte: startOfDay(0) } } }),
    prisma.photoRecord.count({ where: { status: "uploaded", uploadedAt: { gte: startOfDay(6) } } }),
    prisma.photoRecord.count({ where: { status: "uploaded" } }),
    prisma.photoRecord.count({ where: { status: { in: ["pending", "uploading", "failed"] } } }),
    prisma.rep.count({ where: { active: true } }),
    prisma.photoRecord.groupBy({
      by: ["brandId"],
      where: { status: "uploaded" },
      _count: { _all: true },
      orderBy: { _count: { brandId: "desc" } },
      take: 5,
    }),
    prisma.photoRecord.groupBy({
      by: ["shopTypeId"],
      where: { status: "uploaded" },
      _count: { _all: true },
      orderBy: { _count: { shopTypeId: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "uploadedAt") AS day, COUNT(*)::bigint AS count
      FROM "PhotoRecord"
      WHERE "status" = 'uploaded' AND "uploadedAt" >= ${startOfDay(13)}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.photoRecord.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { brand: true, rep: true },
    }),
  ]);

  const [brands, shopTypes] = await Promise.all([
    prisma.brand.findMany({ where: { id: { in: topBrandsRaw.map((b) => b.brandId) } } }),
    prisma.shopType.findMany({ where: { id: { in: topShopTypesRaw.map((s) => s.shopTypeId) } } }),
  ]);

  const topBrands = topBrandsRaw.map((b) => ({
    name: brands.find((br) => br.id === b.brandId)?.name ?? "Unknown",
    count: b._count._all,
  }));
  const topShopTypes = topShopTypesRaw.map((s) => ({
    name: shopTypes.find((st) => st.id === s.shopTypeId)?.name ?? "Unknown",
    count: s._count._all,
  }));

  const dailyMap = new Map(dailyRaw.map((d) => [d.day.toISOString().slice(0, 10), Number(d.count)]));
  const chartData: UploadsChartPoint[] = Array.from({ length: 14 }, (_, i) => {
    const d = startOfDay(13 - i);
    const key = d.toISOString().slice(0, 10);
    return { date: key.slice(5), count: dailyMap.get(key) ?? 0 };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Uploaded today" value={totalToday} />
        <StatCard label="Uploaded this week" value={totalWeek} />
        <StatCard label="Uploaded all-time" value={totalAllTime} />
        <StatCard label="Pending / failed" value={pendingOrFailedCount} tone={pendingOrFailedCount > 0 ? "warning" : "default"} />
        <StatCard label="Active reps" value={activeRepsCount} />
      </div>

      <UploadsChart data={chartData} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Top brands</h2>
          <ul className="flex flex-col gap-2">
            {topBrands.length === 0 && <li className="text-sm text-gray-500">No uploads yet.</li>}
            {topBrands.map((b) => (
              <li key={b.name} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{b.name}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{b.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Top shop types</h2>
          <ul className="flex flex-col gap-2">
            {topShopTypes.length === 0 && <li className="text-sm text-gray-500">No uploads yet.</li>}
            {topShopTypes.map((s) => (
              <li key={s.name} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{s.name}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent failed uploads</h2>
          <Link href="/admin/photos?status=failed" className="text-sm font-medium text-blue-600">
            View all
          </Link>
        </div>
        {failedRecent.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No failed uploads. 🎉</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {failedRecent.map((f) => (
              <li key={f.id} className="text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">{f.brand.name}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  by {f.rep.name} — {f.errorMessage ?? "Unknown error"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
