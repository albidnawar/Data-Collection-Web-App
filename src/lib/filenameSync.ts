import { prisma } from "@/lib/db";
import { renameAndRefileDriveFile, resolveOrCreateBrandFolder } from "@/lib/driveFolders";

const BATCH_SIZE = 25;

export async function runFilenameSyncBatch(): Promise<{ processed: number; failed: number; remaining: number }> {
  const batch = await prisma.photoRecord.findMany({
    where: { filenameSyncPending: true, driveFileId: { not: null } },
    include: { brand: true },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;

  for (const record of batch) {
    try {
      const folderId = await resolveOrCreateBrandFolder(record.brandId, record.brand.name);
      await renameAndRefileDriveFile({
        fileId: record.driveFileId as string,
        newName: record.filename,
        targetFolderId: folderId,
      });
      await prisma.photoRecord.update({
        where: { id: record.id },
        data: { filenameSyncPending: false },
      });
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  const remaining = await prisma.photoRecord.count({
    where: { filenameSyncPending: true, driveFileId: { not: null } },
  });

  return { processed, failed, remaining };
}
