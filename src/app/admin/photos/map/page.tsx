import Link from "next/link";
import { prisma } from "@/lib/db";
import { PhotoMap, type PhotoPin } from "@/components/admin/PhotoMap";

export default async function AdminPhotosMapPage() {
  const [brands, records] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.photoRecord.findMany({
      // Outlet storefront photos (kind "outlet") aren't tied to one brand, so
      // this brand-filterable map excludes them — they'd never match any
      // brand filter anyway.
      where: { gpsLat: { not: null }, gpsLng: { not: null }, brandId: { not: null } },
      orderBy: { capturedAt: "desc" },
      select: {
        id: true,
        gpsLat: true,
        gpsLng: true,
        filename: true,
        capturedAt: true,
        driveFileUrl: true,
        brandId: true,
        brand: { select: { name: true } },
        rep: { select: { name: true } },
      },
    }),
  ]);

  const pins: PhotoPin[] = records
    .filter((r): r is typeof r & { brandId: string; brand: { name: string } } => r.brandId !== null && r.brand !== null)
    .map((r) => ({
      id: r.id,
      lat: r.gpsLat as number,
      lng: r.gpsLng as number,
      filename: r.filename,
      capturedAt: r.capturedAt.toISOString(),
      driveFileUrl: r.driveFileUrl,
      brandId: r.brandId,
      brandName: r.brand.name,
      repName: r.rep.name,
    }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Photo map</h1>
        <Link href="/admin/photos" className="text-sm font-medium text-blue-600">
          Back to photo log
        </Link>
      </div>
      <PhotoMap pins={pins} brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
