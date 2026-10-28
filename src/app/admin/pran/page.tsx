import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildPhotoWhere } from "@/lib/adminPhotoFilters";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { DeletePhotoButton } from "@/components/admin/DeletePhotoButton";
import { PhotoThumbnail } from "@/components/admin/PhotoThumbnail";
import { PhotoLightboxProvider } from "@/components/admin/PhotoLightbox";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

type OutletVisit = {
  id: string;
  filename: string;
  driveFileId: string | null;
  capturedAt: Date;
};

export default async function AdminPranPage(props: PageProps<"/admin/pran">) {
  const sp = await props.searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    repId: get("repId"),
    brandId: get("brandId"),
    pranRelation: get("pranRelation"),
    outletName: get("outletName"),
  };
  const page = Math.max(1, Number(get("page") ?? "1") || 1);

  // Every photo captured by a Pran-role rep belongs in this module, not just
  // the ones tagged Pran/Competitor - that's how the outlet's own outside
  // photo (kind "outlet", which never carries a pranRelation tag) shows up
  // here as its own row instead of only being visible in /admin/photos.
  const where: Prisma.PhotoRecordWhereInput = buildPhotoWhere(filters);
  where.rep = { role: "pran" };

  const [reps, brands, total, records] = await Promise.all([
    prisma.rep.findMany({ where: { role: "pran" }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.photoRecord.count({ where }),
    prisma.photoRecord.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { rep: true, brand: true, category: true, posmType: true, skuType: true, shopType: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Match each product photo to the outlet's own outside photo from the same
  // visit: same rep + outlet name, the latest outlet-kind shot taken at or
  // before this one (outletName isn't a strict FK, but a rep only reuses a
  // visit's name while it's still open, so this pins down the right visit).
  const repIds = Array.from(new Set(records.map((r) => r.repId)));
  const outletNames = Array.from(new Set(records.map((r) => r.outletName).filter((n): n is string => !!n)));

  const outletRecords =
    repIds.length > 0 && outletNames.length > 0
      ? await prisma.photoRecord.findMany({
          where: { kind: "outlet", repId: { in: repIds }, outletName: { in: outletNames } },
          orderBy: { capturedAt: "asc" },
          select: { id: true, repId: true, outletName: true, capturedAt: true, filename: true, driveFileId: true },
        })
      : [];

  const outletsByKey = new Map<string, OutletVisit[]>();
  for (const o of outletRecords) {
    const key = `${o.repId}::${o.outletName}`;
    const list = outletsByKey.get(key) ?? [];
    list.push(o);
    outletsByKey.set(key, list);
  }

  const findOutletVisit = (repId: string, outletName: string | null, capturedAt: Date): OutletVisit | null => {
    if (!outletName) return null;
    const candidates = outletsByKey.get(`${repId}::${outletName}`) ?? [];
    let match: OutletVisit | null = null;
    for (const c of candidates) {
      if (c.capturedAt <= capturedAt) match = c;
      else break;
    }
    return match;
  };

  const lightboxPhotos = new Map<string, { id: string; filename: string }>();
  for (const r of records) lightboxPhotos.set(r.id, { id: r.id, filename: r.filename });
  for (const o of outletRecords) lightboxPhotos.set(o.id, { id: o.id, filename: o.filename });

  const buildQuery = (extra: Record<string, string> = {}) =>
    new URLSearchParams(
      Object.entries({ ...filters, ...extra }).filter(([, v]) => v) as [string, string][],
    ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pran Tracking</h1>
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
          Pran / Competitor
          <select name="pranRelation" defaultValue={filters.pranRelation ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            <option value="pran">Pran</option>
            <option value="competitor">Competitor</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Outlet name
          <input type="text" name="outletName" defaultValue={filters.outletName} placeholder="Search outlet…" className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </label>
        <button type="submit" className="self-end rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900">
          Filter
        </button>
      </form>

      <PhotoLightboxProvider photos={Array.from(lightboxPhotos.values())}>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2">Photo</th>
                <th className="px-3 py-2">Pran / Competitor</th>
                <th className="px-3 py-2">Outlet Photo</th>
                <th className="px-3 py-2">Outlet Name</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Shop Type</th>
                <th className="px-3 py-2">Execution</th>
                <th className="px-3 py-2">Rep</th>
                <th className="px-3 py-2">Captured</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Drive</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isOutletKind = r.kind === "outlet";
                const typeName =
                  r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.kind === "sku" ? r.skuType?.name : undefined;
                const outletVisit = isOutletKind ? null : findOutletVisit(r.repId, r.outletName, r.capturedAt);
                const remarks = [r.surroundingRemarks, r.otherRemarks].filter(Boolean).join(" / ");

                return (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2">
                      <PhotoThumbnail photoId={r.id} hasFile={!!r.driveFileId} />
                    </td>
                    <td className="px-3 py-2">
                      {isOutletKind ? (
                        "-"
                      ) : (
                        <span className={r.pranRelation === "pran" ? "font-medium text-blue-600" : "font-medium text-amber-600"}>
                          {r.pranRelation === "pran" ? "Pran" : "Competitor"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isOutletKind ? (
                        "-"
                      ) : outletVisit ? (
                        <PhotoThumbnail photoId={outletVisit.id} hasFile={!!outletVisit.driveFileId} />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800" />
                      )}
                    </td>
                    <td className="px-3 py-2">{r.outletName ?? "-"}</td>
                    <td className="px-3 py-2">{r.brand?.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.kind === "posm"
                        ? "POSM"
                        : r.kind === "category"
                          ? "Category Shelf Display"
                          : r.kind === "sku"
                            ? "SKU"
                            : "Outlet"}
                    </td>
                    <td className="px-3 py-2">{typeName ?? "-"}</td>
                    <td className="px-3 py-2">{r.shopType?.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      {isOutletKind ? (
                        "-"
                      ) : (
                        <span className={r.isGoodExecution ? "text-green-600" : "text-red-600"}>
                          {r.isGoodExecution ? "Good" : "Bad"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.rep.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <LocalDateTime iso={r.capturedAt.toISOString()} />
                    </td>
                    <td className="px-3 py-2">{r.address ?? "-"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2" title={remarks || undefined}>
                      {remarks || "-"}
                    </td>
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
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <DeletePhotoButton id={r.id} />
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-3 py-6 text-center text-gray-500">
                    No Pran photos match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PhotoLightboxProvider>

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
