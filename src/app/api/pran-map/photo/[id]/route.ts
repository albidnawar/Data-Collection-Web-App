import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDriveClient } from "@/lib/driveClient";
import { downloadDriveFileBytes } from "@/lib/driveFolders";
import { pranMapKeyValid, PRAN_MAP_CORS_HEADERS } from "@/lib/pranMapAuth";

// Thumbnail-with-full-image-fallback behavior like
// /api/admin/photos/[id]/thumbnail by default (small, fast Google-hosted
// thumbnail — good enough for the 64px list row), but ?full=1 skips straight
// to the actual Drive file bytes, same as /api/admin/photos/[id]/image, for
// the enlarged/zoomed view. Key-gated for the separately-hosted Pran map app
// instead of session-gated, and scoped to "pran"-role photos only — this key
// should never be able to pull an arbitrary photo outside that feature's own
// dataset.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PRAN_MAP_CORS_HEADERS });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!pranMapKeyValid(request)) {
    return new NextResponse("Forbidden", { status: 403, headers: PRAN_MAP_CORS_HEADERS });
  }

  const { id } = await params;
  const wantsFull = new URL(request.url).searchParams.get("full") === "1";
  const record = await prisma.photoRecord.findUnique({
    where: { id },
    select: { driveFileId: true, rep: { select: { role: true } } },
  });
  if (!record?.driveFileId || record.rep.role !== "pran") {
    return new NextResponse(null, { status: 404, headers: PRAN_MAP_CORS_HEADERS });
  }

  if (!wantsFull) {
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
              ...PRAN_MAP_CORS_HEADERS,
            },
          });
        }
      }
    } catch {
      // Fall through to the full-image fallback below.
    }
  }

  try {
    const bytes = await downloadDriveFileBytes(record.driveFileId);
    return new NextResponse(new Blob([Uint8Array.from(bytes)]), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        ...PRAN_MAP_CORS_HEADERS,
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: PRAN_MAP_CORS_HEADERS });
  }
}
