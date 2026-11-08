import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export interface PhotoFilterParams {
  dateFrom?: string;
  dateTo?: string;
  repId?: string;
  brandId?: string;
  shopTypeId?: string;
  kind?: string;
  status?: string;
  executionQuality?: string;
  shelfVacancy?: string;
  pranRelation?: string;
  outletName?: string;
}

export function buildPhotoWhere(params: PhotoFilterParams): Prisma.PhotoRecordWhereInput {
  const where: Prisma.PhotoRecordWhereInput = {};

  if (params.dateFrom || params.dateTo) {
    where.capturedAt = {};
    if (params.dateFrom) where.capturedAt.gte = new Date(params.dateFrom);
    if (params.dateTo) where.capturedAt.lte = new Date(`${params.dateTo}T23:59:59.999Z`);
  }
  if (params.repId) where.repId = params.repId;
  if (params.brandId) where.brandId = params.brandId;
  if (params.shopTypeId) where.shopTypeId = params.shopTypeId;
  if (params.kind && ["posm", "category", "sku", "outlet"].includes(params.kind)) {
    where.kind = params.kind as Prisma.EnumPhotoKindFilter["equals"];
  }
  if (params.status && ["pending", "uploading", "uploaded", "failed"].includes(params.status)) {
    where.status = params.status as Prisma.EnumUploadStatusFilter["equals"];
  }
  if (params.executionQuality === "good") where.isGoodExecution = true;
  if (params.executionQuality === "bad") where.isGoodExecution = false;
  if (params.shelfVacancy === "yes") where.shelfVacancy = true;
  if (params.shelfVacancy === "no") where.shelfVacancy = false;
  if (params.pranRelation && ["pran", "competitor"].includes(params.pranRelation)) {
    where.pranRelation = params.pranRelation as Prisma.EnumPranRelationNullableFilter["equals"];
  }
  if (params.outletName) where.outletName = { contains: params.outletName, mode: "insensitive" };

  return where;
}

// Same filters, minus one field — used to work out which options are still
// reachable for that field's own dropdown (so a dropdown never offers a
// choice that would combine with the other active filters to show nothing).
export function buildPhotoWhereExcluding(
  params: PhotoFilterParams,
  exclude: keyof PhotoFilterParams,
): Prisma.PhotoRecordWhereInput {
  return buildPhotoWhere({ ...params, [exclude]: undefined });
}

export interface PhotoFilterOptionSets {
  repIds: Set<string>;
  brandIds: Set<string>;
  shopTypeIds: Set<string>;
  kinds: Set<string>;
  statuses: Set<string>;
  goodExecutions: Set<boolean>;
  shelfVacancies: Set<boolean>;
  pranRelations: Set<string>;
}

// For each filterable field, finds the values that still match at least one
// record once every OTHER active filter is applied — so a dropdown never
// offers a choice that, combined with the rest of the current filters, would
// show zero results. `extraWhere` layers in a page-level constraint (e.g. the
// Pran module's "only this rep's role" scoping) that always applies.
export async function getAvailablePhotoFilterOptions(
  filters: PhotoFilterParams,
  extraWhere: Prisma.PhotoRecordWhereInput = {},
): Promise<PhotoFilterOptionSets> {
  const whereExcluding = (field: keyof PhotoFilterParams) => ({
    ...buildPhotoWhereExcluding(filters, field),
    ...extraWhere,
  });

  // Run one at a time rather than in parallel — this page already has a
  // handful of its own concurrent queries in flight, and piling 8 more on
  // top of those exhausts the local dev Postgres connection pool (seen as a
  // "Server has closed the connection" error).
  const reps = await prisma.photoRecord.groupBy({ by: ["repId"], where: whereExcluding("repId"), _count: { _all: true } });
  const brands = await prisma.photoRecord.groupBy({ by: ["brandId"], where: whereExcluding("brandId"), _count: { _all: true } });
  const shopTypes = await prisma.photoRecord.groupBy({ by: ["shopTypeId"], where: whereExcluding("shopTypeId"), _count: { _all: true } });
  const kinds = await prisma.photoRecord.groupBy({ by: ["kind"], where: whereExcluding("kind"), _count: { _all: true } });
  const statuses = await prisma.photoRecord.groupBy({ by: ["status"], where: whereExcluding("status"), _count: { _all: true } });
  const executions = await prisma.photoRecord.groupBy({
    by: ["isGoodExecution"],
    where: whereExcluding("executionQuality"),
    _count: { _all: true },
  });
  const shelfVacancies = await prisma.photoRecord.groupBy({
    by: ["shelfVacancy"],
    where: whereExcluding("shelfVacancy"),
    _count: { _all: true },
  });
  const pranRelations = await prisma.photoRecord.groupBy({
    by: ["pranRelation"],
    where: whereExcluding("pranRelation"),
    _count: { _all: true },
  });

  return {
    repIds: new Set(reps.map((r) => r.repId)),
    brandIds: new Set(brands.map((r) => r.brandId).filter((v): v is string => !!v)),
    shopTypeIds: new Set(shopTypes.map((r) => r.shopTypeId).filter((v): v is string => !!v)),
    kinds: new Set(kinds.map((r) => r.kind)),
    statuses: new Set(statuses.map((r) => r.status)),
    goodExecutions: new Set(executions.map((r) => r.isGoodExecution)),
    shelfVacancies: new Set(shelfVacancies.map((r) => r.shelfVacancy).filter((v): v is boolean => v !== null)),
    pranRelations: new Set<string>(pranRelations.map((r) => r.pranRelation).filter((v): v is NonNullable<typeof v> => v !== null)),
  };
}
