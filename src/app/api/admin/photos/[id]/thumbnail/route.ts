import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getDriveClient } from "@/lib/driveClient";
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
    const drive = getDriveClient();
    const file = await drive.files.get({ fileId: record.driveFileId, fields: "thumbnailLink" });
    const thumbnailLink = file.data.thumbnailLink;
    if (thumbnailLink) {
      const thumbRes = await fetch(thumbnailLink);
      if (thumbRes.ok && thumbRes.body) {
        return new NextResponse(thumbRes.body, {
          headers: {
            "Content-Type": thumbRes.headers.get("content-type") ?? "image/jpeg",
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }
  } catch {
    // Fall through to the full-image fallback below.
  }

  // Google's thumbnail CDN link can be flaky or rate-limited even when the
  // file itself is perfectly readable via the Drive API — fall back to the
  // full image rather than leaving the table with a broken thumbnail.
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
