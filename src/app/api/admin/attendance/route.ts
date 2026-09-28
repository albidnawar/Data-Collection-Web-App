import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildAttendanceWhere } from "@/lib/adminAttendanceFilters";

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
  const where = buildAttendanceWhere(params);

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { dateKey: "desc" },
    include: { rep: true },
  });

  if (params.format !== "csv") {
    return NextResponse.json({ records });
  }

  const header = [
    "date",
    "rep",
    "clockInAt",
    "clockInLat",
    "clockInLng",
    "clockInAddress",
    "clockInPhotoUrl",
    "clockOutAt",
    "clockOutLat",
    "clockOutLng",
    "clockOutAddress",
    "clockOutPhotoUrl",
  ];

  const rows = records.map((r) =>
    [
      r.dateKey,
      r.rep.name,
      r.clockInAt.toISOString(),
      r.clockInLat?.toString() ?? "",
      r.clockInLng?.toString() ?? "",
      r.clockInAddress ?? "",
      r.clockInPhotoUrl ?? "",
      r.clockOutAt?.toISOString() ?? "",
      r.clockOutLat?.toString() ?? "",
      r.clockOutLng?.toString() ?? "",
      r.clockOutAddress ?? "",
      r.clockOutPhotoUrl ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="camtag-attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
