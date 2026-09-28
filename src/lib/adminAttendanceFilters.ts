import type { Prisma } from "@/generated/prisma/client";

export interface AttendanceFilterParams {
  dateFrom?: string;
  dateTo?: string;
  repId?: string;
}

export function buildAttendanceWhere(params: AttendanceFilterParams): Prisma.AttendanceWhereInput {
  const where: Prisma.AttendanceWhereInput = {};

  if (params.dateFrom || params.dateTo) {
    where.dateKey = {};
    if (params.dateFrom) where.dateKey.gte = params.dateFrom;
    if (params.dateTo) where.dateKey.lte = params.dateTo;
  }
  if (params.repId) where.repId = params.repId;

  return where;
}
