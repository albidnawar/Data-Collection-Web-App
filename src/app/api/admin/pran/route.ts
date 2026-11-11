import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildPhotoWhere } from "@/lib/adminPhotoFilters";
import { matchOutletVisits } from "@/lib/pranTracking";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  if (params.format !== "xlsx") {
    return NextResponse.json({ error: "Only format=xlsx is supported." }, { status: 400 });
  }

  // Same scoping as the Pran Tracking page: every photo from a Pran-role
  // rep, not just the ones tagged Pran/Competitor.
  const where: Prisma.PhotoRecordWhereInput = buildPhotoWhere(params);
  where.rep = { role: "pran" };

  const records = await prisma.photoRecord.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    include: { rep: true, brand: true, category: true, posmType: true, skuType: true, shopType: true },
  });

  const { visibleRecords, findOutletVisit } = await matchOutletVisits(records);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pran Tracking");

  sheet.columns = [
    { header: "Pran / Competitor", key: "pranRelation", width: 16 },
    { header: "Outlet Name", key: "outletName", width: 24 },
    { header: "Brand", key: "brand", width: 16 },
    { header: "Kind", key: "kind", width: 20 },
    { header: "Type", key: "type", width: 20 },
    { header: "Shop Type", key: "shopType", width: 16 },
    { header: "Execution", key: "execution", width: 12 },
    { header: "Rep", key: "rep", width: 16 },
    { header: "Captured At", key: "capturedAt", width: 20 },
    { header: "GPS Lat", key: "gpsLat", width: 12 },
    { header: "GPS Lng", key: "gpsLng", width: 12 },
    { header: "Address", key: "address", width: 28 },
    { header: "Surrounding Remarks", key: "surroundingRemarks", width: 28 },
    { header: "Other Remarks", key: "otherRemarks", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Filename", key: "filename", width: 32 },
    { header: "Drive URL", key: "driveFileUrl", width: 36 },
    { header: "Outlet Photo Drive URL", key: "outletDriveFileUrl", width: 36 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of visibleRecords) {
    const isOutletKind = r.kind === "outlet";
    const typeName =
      r.kind === "posm" ? r.posmType?.name : r.kind === "category" ? r.category?.name : r.kind === "sku" ? r.skuType?.name : undefined;
    const outletVisit = isOutletKind ? null : findOutletVisit(r.repId, r.outletName, r.capturedAt);

    sheet.addRow({
      pranRelation: isOutletKind ? "" : r.pranRelation === "pran" ? "Pran" : "Competitor",
      outletName: r.outletName ?? "",
      brand: r.brand?.name ?? "",
      kind:
        r.kind === "posm"
          ? "POSM"
          : r.kind === "category"
            ? "Category Shelf Display"
            : r.kind === "outlet"
              ? "Outlet"
              : "SKU",
      type: typeName ?? "",
      shopType: r.shopType?.name ?? "",
      execution: isOutletKind ? "" : r.isGoodExecution ? "Good" : "Bad",
      rep: r.rep.name,
      capturedAt: r.capturedAt.toISOString(),
      gpsLat: r.gpsLat ?? "",
      gpsLng: r.gpsLng ?? "",
      address: r.address ?? "",
      surroundingRemarks: r.surroundingRemarks ?? "",
      otherRemarks: r.otherRemarks ?? "",
      status: r.status,
      filename: r.filename,
      driveFileUrl: r.driveFileUrl ?? "",
      outletDriveFileUrl: outletVisit?.driveFileUrl ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="camtag-pran-tracking-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
