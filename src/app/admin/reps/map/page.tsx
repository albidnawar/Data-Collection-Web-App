import Link from "next/link";
import { prisma } from "@/lib/db";
import { RepMovementMap, type RepMovementPoint } from "@/components/admin/RepMovementMap";

export default async function AdminRepsMapPage() {
  const [reps, records] = await Promise.all([
    prisma.rep.findMany({ orderBy: { name: "asc" } }),
    // Only product photos (posm/category/sku) trace a rep's movement through
    // outlets - the outlet's own outside photo and attendance selfies aren't
    // "product picture" clicks.
    prisma.photoRecord.findMany({
      where: { kind: { in: ["posm", "category", "sku"] }, gpsLat: { not: null }, gpsLng: { not: null } },
      orderBy: { capturedAt: "asc" },
      select: {
        id: true,
        repId: true,
        gpsLat: true,
        gpsLng: true,
        capturedAt: true,
        filename: true,
        kind: true,
        driveFileUrl: true,
        category: { select: { name: true } },
        posmType: { select: { name: true } },
        skuType: { select: { name: true } },
      },
    }),
  ]);

  const points: RepMovementPoint[] = records.map((r) => {
    const typeName = r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.skuType?.name;
    const kindLabel = r.kind === "posm" ? "POSM" : r.kind === "category" ? "Category Shelf Display" : "SKU";
    return {
      id: r.id,
      repId: r.repId,
      lat: r.gpsLat as number,
      lng: r.gpsLng as number,
      capturedAt: r.capturedAt.toISOString(),
      filename: r.filename,
      typeLabel: typeName ? `${kindLabel} — ${typeName}` : kindLabel,
      driveFileUrl: r.driveFileUrl,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rep movement map</h1>
        <Link href="/admin/reps" className="text-sm font-medium text-blue-600">
          Back to reps
        </Link>
      </div>
      <RepMovementMap points={points} reps={reps.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
