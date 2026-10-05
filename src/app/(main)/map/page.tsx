import { prisma } from "@/lib/db";
import { OutletMap } from "@/components/map/OutletMap";

export default async function MapPage() {
  const [outlets, brands] = await Promise.all([
    prisma.outlet.findMany({ where: { active: true }, include: { brand: true } }),
    prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const pins = outlets.map((o) => ({
    id: o.id,
    code: o.code,
    lat: o.lat,
    lng: o.lng,
    brandId: o.brandId,
    brandName: o.brand.name,
  }));

  return <OutletMap outlets={pins} brands={brands} />;
}
