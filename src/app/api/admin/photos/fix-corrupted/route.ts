import { NextResponse } from "next/server";
import convert from "heic-convert";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { downloadDriveFileBytes, overwriteDriveFileContent } from "@/lib/driveFolders";
import { sniffImageFormat } from "@/lib/imageFormat";

export const maxDuration = 60;

const BATCH_SIZE = 10;

export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.photoRecord.findMany({
    where: { driveFileId: { not: null }, status: "uploaded", byteFormatCheckedAt: null },
    take: BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  let fixed = 0;
  let alreadyOk = 0;
  let unknown = 0;

  for (const record of batch) {
    if (!record.driveFileId) continue;

    try {
      const bytes = await downloadDriveFileBytes(record.driveFileId);
      const format = sniffImageFormat(bytes);

      if (format === "heic") {
        const jpegBytes = await convert({ buffer: bytes, format: "JPEG", quality: 0.9 });
        await overwriteDriveFileContent({
          fileId: record.driveFileId,
          fileBuffer: Buffer.from(jpegBytes),
          mimeType: "image/jpeg",
        });
        fixed += 1;
      } else if (format === "jpeg") {
        alreadyOk += 1;
      } else {
        unknown += 1;
      }
    } catch {
      unknown += 1;
    }

    await prisma.photoRecord.update({
      where: { id: record.id },
      data: { byteFormatCheckedAt: new Date() },
    });
  }

  const remaining = await prisma.photoRecord.count({
    where: { driveFileId: { not: null }, status: "uploaded", byteFormatCheckedAt: null },
  });

  return NextResponse.json({ processed: batch.length, fixed, alreadyOk, unknown, remaining });
}
