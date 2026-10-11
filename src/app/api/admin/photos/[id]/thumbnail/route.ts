import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getDriveClient } from "@/lib/driveClient";

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
    const drive = getDriveClient();
    const file = await drive.files.get({ fileId: record.driveFileId, fields: "thumbnailLink" });
    const thumbnailLink = file.data.thumbnailLink;
    if (!thumbnailLink) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.redirect(thumbnailLink);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
