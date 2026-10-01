import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildPhotoWhere } from "@/lib/adminPhotoFilters";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const where = buildPhotoWhere(params);

  const records = await prisma.photoRecord.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    include: { rep: true, brand: true, category: true, posmType: true, skuType: true, shopType: true },
  });

  if (params.format !== "csv") {
    return NextResponse.json({ records });
  }

  const header = [
    "capturedAt",
    "rep",
    "brand",
    "kind",
    "type",
    "shopType",
    "executionQuality",
    "shelfVacancy",
    "surroundingRemarks",
    "otherRemarks",
    "gpsLat",
    "gpsLng",
    "address",
    "status",
    "filename",
    "driveFileUrl",
  ];

  const rows = records.map((r) =>
    [
      r.capturedAt.toISOString(),
      r.rep.name,
      r.brand.name,
      r.kind === "posm" ? "POSM" : r.kind === "category" ? "Category Shelf Display" : "SKU",
      (r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.skuType?.name) ?? "",
      r.shopType.name,
      r.isGoodExecution ? "Good" : "Bad",
      r.shelfVacancy === true ? "Yes" : r.shelfVacancy === false ? "No" : "",
      r.surroundingRemarks ?? "",
      r.otherRemarks ?? "",
      r.gpsLat?.toString() ?? "",
      r.gpsLng?.toString() ?? "",
      r.address ?? "",
      r.status,
      r.filename,
      r.driveFileUrl ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="camtag-photos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
