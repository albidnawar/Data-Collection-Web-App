import type { Prisma } from "@/generated/prisma/client";

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
  if (params.kind && ["posm", "category", "sku"].includes(params.kind)) {
    where.kind = params.kind as Prisma.EnumPhotoKindFilter["equals"];
  }
  if (params.status && ["pending", "uploading", "uploaded", "failed"].includes(params.status)) {
    where.status = params.status as Prisma.EnumUploadStatusFilter["equals"];
  }
  if (params.executionQuality === "good") where.isGoodExecution = true;
  if (params.executionQuality === "bad") where.isGoodExecution = false;
  if (params.shelfVacancy === "yes") where.shelfVacancy = true;
  if (params.shelfVacancy === "no") where.shelfVacancy = false;

  return where;
}
