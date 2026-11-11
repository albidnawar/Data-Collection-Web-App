import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type PranTrackingRecord = Prisma.PhotoRecordGetPayload<{
  include: { rep: true; brand: true; category: true; posmType: true; skuType: true; shopType: true };
}>;

export interface OutletVisit {
  id: string;
  filename: string;
  driveFileId: string | null;
  driveFileUrl: string | null;
  capturedAt: Date;
}

export interface PranOutletMatch {
  // Same set of records passed in, minus any standalone "outlet" row already
  // represented as some other row's matched outlet visit (see findOutletVisit
  // below) — avoids showing that outlet shot twice.
  visibleRecords: PranTrackingRecord[];
  findOutletVisit: (repId: string, outletName: string | null, capturedAt: Date) => OutletVisit | null;
}

// Matches each product photo in `records` to the outlet's own outside photo
// from the same visit (same rep + outlet name, the latest outlet-kind shot
// taken at or before this one — outletName isn't a strict FK, but a rep only
// reuses a visit's name while it's still open, so this pins down the right
// visit), and drops any standalone outlet row that's already shown that way.
// Shared between the Pran Tracking page (one page of records) and its Excel
// export (every matching record) so both apply the exact same matching rule.
export async function matchOutletVisits(records: PranTrackingRecord[]): Promise<PranOutletMatch> {
  const repIds = Array.from(new Set(records.map((r) => r.repId)));
  const outletNames = Array.from(new Set(records.map((r) => r.outletName).filter((n): n is string => !!n)));

  const outletRecords =
    repIds.length > 0 && outletNames.length > 0
      ? await prisma.photoRecord.findMany({
          where: { kind: "outlet", repId: { in: repIds }, outletName: { in: outletNames } },
          orderBy: { capturedAt: "asc" },
          select: { id: true, repId: true, outletName: true, capturedAt: true, filename: true, driveFileId: true, driveFileUrl: true },
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

  // Checked against every product photo for these reps/outlets (not just the
  // records passed in) so the standalone outlet row disappears as soon as any
  // product photo exists for that visit, wherever it lands.
  const productRecordsForMatching =
    repIds.length > 0 && outletNames.length > 0
      ? await prisma.photoRecord.findMany({
          where: { kind: { in: ["posm", "category", "sku"] }, repId: { in: repIds }, outletName: { in: outletNames } },
          select: { repId: true, outletName: true, capturedAt: true },
        })
      : [];

  const usedOutletIds = new Set<string>();
  for (const p of productRecordsForMatching) {
    const visit = findOutletVisit(p.repId, p.outletName, p.capturedAt);
    if (visit) usedOutletIds.add(visit.id);
  }

  const visibleRecords = records.filter((r) => !(r.kind === "outlet" && usedOutletIds.has(r.id)));

  return { visibleRecords, findOutletVisit };
}
