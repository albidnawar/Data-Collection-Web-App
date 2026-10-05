import { NextResponse } from "next/server";
import convert from "heic-convert";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { downloadDriveFileBytes, overwriteDriveFileContent } from "@/lib/driveFolders";
import { sniffImageFormat } from "@/lib/imageFormat";

export const maxDuration = 60;

const BATCH_SIZE = 10;

function pendingWhere() {
  return {
    driveFileId: { not: null },
    status: "uploaded" as const,
    byteFormatCheckedAt: null,
  };
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.photoRecord.findMany({
    where: pendingWhere(),
    take: BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  let fixed = 0;
  let alreadyOk = 0;
  let unknown = 0;
  let empty = 0;
  const issues: Array<{ id: string; filename: string; driveFileId: string; reason: string }> = [];

  for (const record of batch) {
    if (!record.driveFileId) continue;
    let issueText: string | null = null;

    try {
      const bytes = await downloadDriveFileBytes(record.driveFileId);

      if (bytes.length === 0) {
        // Not a format problem — the Drive file itself has no data. This
        // happens when a photo sat a long time in the offline queue and the
        // browser's stored Blob reference came back empty on read. There's
        // nothing to recover; the rep needs to retake this specific photo.
        empty += 1;
        issueText = "File is empty (0 bytes) on Drive — this photo was never actually captured/uploaded and can't be recovered. The rep needs to retake it.";
      } else {
        const format = sniffImageFormat(bytes);

        if (format === "heic") {
          try {
            const jpegBytes = await convert({ buffer: bytes, format: "JPEG", quality: 0.9 });
            await overwriteDriveFileContent({
              fileId: record.driveFileId,
              fileBuffer: Buffer.from(jpegBytes),
              mimeType: "image/jpeg",
            });
            fixed += 1;
          } catch (err) {
            unknown += 1;
            issueText = `HEIC detected but conversion failed: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else if (format === "jpeg") {
          alreadyOk += 1;
        } else {
          unknown += 1;
          issueText = `Unrecognized format (not JPEG, not HEIC) — ${bytes.length} bytes, header ${bytes.subarray(0, 16).toString("hex")}`;
        }
      }
    } catch (err) {
      unknown += 1;
      issueText = `Download failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (issueText) {
      issues.push({ id: record.id, filename: record.filename, driveFileId: record.driveFileId, reason: issueText });
    }

    await prisma.photoRecord.update({
      where: { id: record.id },
      data: { byteFormatCheckedAt: new Date(), byteFormatIssue: issueText },
    });
  }

  const remaining = await prisma.photoRecord.count({ where: pendingWhere() });

  return NextResponse.json({ processed: batch.length, fixed, alreadyOk, unknown, empty, remaining, issues });
}
