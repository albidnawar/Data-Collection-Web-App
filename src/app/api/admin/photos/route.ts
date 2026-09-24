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
    include: { rep: true, brand: true, category: true, posmType: true, shopType: true },
  });

  if (params.format !== "csv") {
    return NextResponse.json({ records });
  }

  const header = [
    "capturedAt",
    "rep",
    "brand",
    "isPosm",
    "posmType",
    "category",
    "shopType",
    "shopName",
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
      r.isPosm ? "Yes" : "No",
      r.posmType?.name ?? "",
      r.category.name,
      r.shopType.name,
      r.shopName,
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
      "Content-Disposition": `attachment; filename="fieldlenz-photos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
