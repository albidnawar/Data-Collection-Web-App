import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getDhakaDayBoundsUtc } from "@/lib/attendanceDate";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getDhakaDayBoundsUtc();

  const count = await prisma.photoRecord.count({
    where: {
      repId: session.user.id,
      capturedAt: { gte: start, lt: end },
    },
  });

  return NextResponse.json({ count });
}
