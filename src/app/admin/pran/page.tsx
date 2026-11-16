import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildPhotoWhere, getAvailablePhotoFilterOptions } from "@/lib/adminPhotoFilters";
import { matchOutletVisits } from "@/lib/pranTracking";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { DeletePhotoButton } from "@/components/admin/DeletePhotoButton";
import { PhotoThumbnail } from "@/components/admin/PhotoThumbnail";
import { PhotoTagsCells } from "@/components/admin/PhotoTagsCells";
import { PhotoLightboxProvider } from "@/components/admin/PhotoLightbox";
import { KIND_OPTIONS, STATUS_OPTIONS, EXECUTION_OPTIONS, SHELF_VACANCY_OPTIONS } from "@/lib/photoFilterOptions";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

export default async function AdminPranPage(props: PageProps<"/admin/pran">) {
  const sp = await props.searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    repId: get("repId"),
    brandId: get("brandId"),
    shopTypeId: get("shopTypeId"),
    productCategoryId: get("productCategoryId"),
    kind: get("kind"),
    status: get("status"),
    executionQuality: get("executionQuality"),
    shelfVacancy: get("shelfVacancy"),
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

  const [reps, brands, shopTypes, categories, posmTypes, skuTypes, productCategories, total, records] =
    await Promise.all([
      prisma.rep.findMany({ where: { role: "pran" }, orderBy: { name: "asc" } }),
      prisma.brand.findMany({ orderBy: { name: "asc" } }),
      prisma.shopType.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.posmType.findMany({ orderBy: { name: "asc" } }),
      prisma.skuType.findMany({ orderBy: { name: "asc" } }),
      prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.photoRecord.count({ where }),
      prisma.photoRecord.findMany({
        where,
        orderBy: { capturedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { rep: true, brand: true, category: true, posmType: true, skuType: true, shopType: true, productCategory: true },
      }),
    ]);
  // Run after the batch above finishes rather than alongside it — it issues
  // its own sequence of queries, and the local dev Postgres connection pool
  // can't take all of these running at once.
  const available = await getAvailablePhotoFilterOptions(filters, { rep: { role: "pran" } });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Same cascading-availability behavior as the main Photo log: each
  // dropdown only offers choices reachable given the other active filters,
  // but the currently selected value is always kept visible.
  const visibleReps = reps.filter((r) => available.repIds.has(r.id) || r.id === filters.repId);
  const visibleBrands = brands.filter((b) => available.brandIds.has(b.id) || b.id === filters.brandId);
  const visibleShopTypes = shopTypes.filter((s) => available.shopTypeIds.has(s.id) || s.id === filters.shopTypeId);
  const visibleProductCategories = productCategories.filter(
    (p) => available.productCategoryIds.has(p.id) || p.id === filters.productCategoryId,
  );
  const visibleKinds = KIND_OPTIONS.filter((o) => available.kinds.has(o.value) || o.value === filters.kind);
  const visibleStatuses = STATUS_OPTIONS.filter((o) => available.statuses.has(o.value) || o.value === filters.status);
  const visibleExecutions = EXECUTION_OPTIONS.filter(
    (o) => available.goodExecutions.has(o.value === "good") || o.value === filters.executionQuality,
  );
  const visibleShelfVacancies = SHELF_VACANCY_OPTIONS.filter(
    (o) => available.shelfVacancies.has(o.value === "yes") || o.value === filters.shelfVacancy,
  );
  const pranRelationAvailable = (value: "pran" | "competitor") =>
    available.pranRelations.has(value) || value === filters.pranRelation;

  const { visibleRecords, findOutletVisit } = await matchOutletVisits(records);

  type LightboxPhoto = Parameters<typeof PhotoLightboxProvider>[0]["photos"][number];
  const lightboxPhotos = new Map<string, LightboxPhoto>();
  for (const r of visibleRecords) {
    const typeId = r.kind === "posm" ? r.posmTypeId : r.kind === "category" ? r.categoryId : r.skuTypeId;
    const typeName =
      r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.skuType?.name;
    lightboxPhotos.set(r.id, {
      id: r.id,
      filename: r.filename,
      kind: r.kind,
      outletName: r.outletName,
      brandId: r.brandId,
      brandName: r.brand?.name ?? null,
      typeId: typeId ?? null,
      typeName: typeName ?? null,
      shopTypeId: r.shopTypeId,
      shopTypeName: r.shopType?.name ?? null,
      isGoodExecution: r.isGoodExecution,
      productCategoryId: r.productCategoryId,
      productCategoryName: r.productCategory?.name ?? null,
      shelfVacancy: r.shelfVacancy,
      surroundingRemarks: r.surroundingRemarks,
      otherRemarks: r.otherRemarks,
      repIsPranRole: true,
    });
  }
  for (const r of records) {
    const visit = r.kind === "outlet" ? null : findOutletVisit(r.repId, r.outletName, r.capturedAt);
    if (visit && !lightboxPhotos.has(visit.id)) {
      lightboxPhotos.set(visit.id, { id: visit.id, filename: visit.filename });
    }
  }

  const buildQuery = (extra: Record<string, string> = {}) =>
    new URLSearchParams(
      Object.entries({ ...filters, ...extra }).filter(([, v]) => v) as [string, string][],
    ).toString();

  const exportQuery = buildQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pran Tracking</h1>
        <a
          href={`/api/admin/pran?format=xlsx&${exportQuery}`}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Export Excel
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
            {visibleReps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Brand
          <select name="brandId" defaultValue={filters.brandId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleBrands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Shop type
          <select name="shopTypeId" defaultValue={filters.shopTypeId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleShopTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Product Category
          <select name="productCategoryId" defaultValue={filters.productCategoryId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleProductCategories.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Kind
          <select name="kind" defaultValue={filters.kind ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleKinds.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleStatuses.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Execution
          <select name="executionQuality" defaultValue={filters.executionQuality ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleExecutions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Shelf vacancy
          <select name="shelfVacancy" defaultValue={filters.shelfVacancy ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {visibleShelfVacancies.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Pran / Competitor
          <select name="pranRelation" defaultValue={filters.pranRelation ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All</option>
            {pranRelationAvailable("pran") && <option value="pran">Pran</option>}
            {pranRelationAvailable("competitor") && <option value="competitor">Competitor</option>}
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

      <PhotoLightboxProvider
        photos={Array.from(lightboxPhotos.values())}
        editOptions={{ brands, shopTypes, categories, posmTypes, skuTypes, productCategories }}
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2">Photo</th>
                <th className="px-3 py-2">Pran / Competitor</th>
                <th className="px-3 py-2">Outlet Photo</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Outlet</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Shop type</th>
                <th className="px-3 py-2">Execution</th>
                <th className="px-3 py-2">Product Category</th>
                <th className="px-3 py-2">Edit</th>
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
              {visibleRecords.map((r) => {
                const isOutletKind = r.kind === "outlet";
                const typeId = r.kind === "posm" ? r.posmTypeId : r.kind === "category" ? r.categoryId : r.skuTypeId;
                const typeName =
                  r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.skuType?.name;
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
                    <PhotoTagsCells
                      photoId={r.id}
                      kind={r.kind}
                      outletName={r.outletName}
                      brandId={r.brandId}
                      brandName={r.brand?.name ?? null}
                      typeId={typeId ?? null}
                      typeName={typeName ?? null}
                      shopTypeId={r.shopTypeId}
                      shopTypeName={r.shopType?.name ?? null}
                      isGoodExecution={r.isGoodExecution}
                      productCategoryId={r.productCategoryId}
                      productCategoryName={r.productCategory?.name ?? null}
                      brands={brands}
                      shopTypes={shopTypes}
                      categories={categories}
                      posmTypes={posmTypes}
                      skuTypes={skuTypes}
                      productCategories={productCategories}
                    />
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
              {visibleRecords.length === 0 && (
                <tr>
                  <td colSpan={18} className="px-3 py-6 text-center text-gray-500">
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
