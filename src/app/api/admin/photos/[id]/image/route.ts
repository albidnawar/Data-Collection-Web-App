import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { downloadDriveFileBytes } from "@/lib/driveFolders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.photoRecord.findUnique({ where: { id }, select: { driveFileId: true } });
  if (!record?.driveFileId) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const bytes = await downloadDriveFileBytes(record.driveFileId);
    return new NextResponse(new Blob([Uint8Array.from(bytes)]), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
