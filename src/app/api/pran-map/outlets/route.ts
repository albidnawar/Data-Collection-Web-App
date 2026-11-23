import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPhotoWhere } from "@/lib/adminPhotoFilters";
import { pranMapKeyValid, PRAN_MAP_CORS_HEADERS } from "@/lib/pranMapAuth";
import type { Prisma } from "@/generated/prisma/client";

export interface PranMapItem {
  photoId: string;
  kind: "posm" | "category" | "sku";
  typeName: string | null;
  productCategoryName: string | null;
  shopTypeName: string | null;
  brandName: string | null;
  pranRelation: "pran" | "competitor" | null;
  isGoodExecution: boolean;
  shelfVacancy: boolean | null;
  capturedAt: string;
  repName: string;
  hasImage: boolean;
  surroundingRemarks: string | null;
  otherRemarks: string | null;
}

export interface PranMapOutlet {
  outletName: string;
  lat: number;
  lng: number;
  address: string | null;
  brandNames: string[];
  firstVisitAt: string;
  lastVisitAt: string;
  items: PranMapItem[];
}

// Data feed for the separately-hosted Pran execution map (pran-map/ at the
// repo root). One point per distinct outletName (free text captured by
// "pran"-role reps, not the Outlet model used by the unrelated rep-facing
// /map page) — plotted at the average GPS of every photo captured there,
// since a single visit's outlet photo GPS can be missing or noisy. Any
// outlet with no GPS-tagged photo at all is dropped; it has nowhere to draw.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PRAN_MAP_CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!pranMapKeyValid(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: PRAN_MAP_CORS_HEADERS });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const where: Prisma.PhotoRecordWhereInput = buildPhotoWhere(params);
  where.rep = { role: "pran" };

  const records = await prisma.photoRecord.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    include: { rep: true, brand: true, category: true, posmType: true, skuType: true, shopType: true, productCategory: true },
  });

  interface Group {
    outletName: string;
    lats: number[];
    lngs: number[];
    addresses: Set<string>;
    brandNames: Set<string>;
    firstVisitAt: Date;
    lastVisitAt: Date;
    items: PranMapItem[];
  }

  const groups = new Map<string, Group>();

  for (const r of records) {
    const name = r.outletName?.trim();
    if (!name) continue;

    let g = groups.get(name);
    if (!g) {
      g = {
        outletName: name,
        lats: [],
        lngs: [],
        addresses: new Set(),
        brandNames: new Set(),
        firstVisitAt: r.capturedAt,
        lastVisitAt: r.capturedAt,
        items: [],
      };
      groups.set(name, g);
    }

    if (r.gpsLat != null && r.gpsLng != null) {
      g.lats.push(r.gpsLat);
      g.lngs.push(r.gpsLng);
    }
    if (r.address) g.addresses.add(r.address);
    if (r.brand?.name) g.brandNames.add(r.brand.name);
    if (r.capturedAt < g.firstVisitAt) g.firstVisitAt = r.capturedAt;
    if (r.capturedAt > g.lastVisitAt) g.lastVisitAt = r.capturedAt;

    // The outlet's own outside/storefront photo (kind "outlet") only
    // contributes its GPS/address to the group above — it isn't a
    // category/SKU/POSM item with an execution verdict of its own.
    if (r.kind === "outlet") continue;

    const typeName =
      r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.skuType?.name;

    g.items.push({
      photoId: r.id,
      kind: r.kind,
      typeName: typeName ?? null,
      productCategoryName: r.productCategory?.name ?? null,
      shopTypeName: r.shopType?.name ?? null,
      brandName: r.brand?.name ?? null,
      pranRelation: r.pranRelation,
      isGoodExecution: r.isGoodExecution,
      shelfVacancy: r.shelfVacancy,
      capturedAt: r.capturedAt.toISOString(),
      repName: r.rep.name,
      hasImage: !!r.driveFileId,
      surroundingRemarks: r.surroundingRemarks,
      otherRemarks: r.otherRemarks,
    });
  }

  const outlets: PranMapOutlet[] = Array.from(groups.values())
    .filter((g) => g.lats.length > 0)
    .map((g) => ({
      outletName: g.outletName,
      lat: g.lats.reduce((a, b) => a + b, 0) / g.lats.length,
      lng: g.lngs.reduce((a, b) => a + b, 0) / g.lngs.length,
      address: Array.from(g.addresses)[0] ?? null,
      brandNames: Array.from(g.brandNames),
      firstVisitAt: g.firstVisitAt.toISOString(),
      lastVisitAt: g.lastVisitAt.toISOString(),
      items: g.items,
    }));

  return NextResponse.json({ outlets }, { headers: PRAN_MAP_CORS_HEADERS });
}
