import { getDriveClient } from "@/lib/driveClient";
import { prisma } from "@/lib/db";

function rootFolderId(): string {
  const id = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new Error("Missing DRIVE_ROOT_FOLDER_ID environment variable");
  return id;
}

// Sentinel written into Brand.driveFolderId while one request is in the middle of
// creating that brand's Drive folder, so a concurrent request for the same
// never-before-seen brand waits for and reuses that folder instead of racing to
// create a second one. Never a real Drive file id, so it can't be confused with one.
const PENDING_FOLDER_MARKER = "__pending__";
const CLAIM_POLL_INTERVAL_MS = 300;
const CLAIM_MAX_WAIT_MS = 15000;

async function waitForClaimedFolderId(brandId: string): Promise<string> {
  const deadline = Date.now() + CLAIM_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (brand?.driveFolderId && brand.driveFolderId !== PENDING_FOLDER_MARKER) {
      return brand.driveFolderId;
    }
    await new Promise((resolve) => setTimeout(resolve, CLAIM_POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for another upload to finish creating this brand's Drive folder");
}

export async function resolveOrCreateBrandFolder(brandId: string, brandName: string): Promise<string> {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (brand?.driveFolderId && brand.driveFolderId !== PENDING_FOLDER_MARKER) {
    return brand.driveFolderId;
  }

  // Atomically claim the right to create this brand's folder: the WHERE clause makes
  // this a single conditional UPDATE, so only one concurrent request can ever "win"
  // when two uploads hit a brand that's never had a folder before.
  const claim = await prisma.brand.updateMany({
    where: { id: brandId, driveFolderId: null },
    data: { driveFolderId: PENDING_FOLDER_MARKER },
  });

  if (claim.count === 0) {
    return waitForClaimedFolderId(brandId);
  }

  try {
    const drive = getDriveClient();
    const root = rootFolderId();

    const escapedName = brandName.replace(/'/g, "\\'");
    const existing = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${root}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    let folderId = existing.data.files?.[0]?.id;

    if (!folderId) {
      const created = await drive.files.create({
        requestBody: {
          name: brandName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [root],
        },
        fields: "id",
      });
      folderId = created.data.id ?? undefined;
    }

    if (!folderId) {
      throw new Error(`Failed to resolve or create Drive folder for brand "${brandName}"`);
    }

    await prisma.brand.update({ where: { id: brandId }, data: { driveFolderId: folderId } });

    return folderId;
  } catch (error) {
    // Release the claim so a later retry isn't stuck waiting forever on a folder
    // that never actually got created.
    await prisma.brand.updateMany({
      where: { id: brandId, driveFolderId: PENDING_FOLDER_MARKER },
      data: { driveFolderId: null },
    });
    throw error;
  }
}

export async function uploadPhotoToDrive(params: {
  folderId: string;
  filename: string;
  fileBuffer: Buffer;
}): Promise<{ fileId: string; fileUrl: string }> {
  const { Readable } = await import("node:stream");
  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: params.filename,
      parents: [params.folderId],
    },
    media: {
      mimeType: "image/jpeg",
      body: Readable.from(params.fileBuffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = response.data.id;
  const fileUrl = response.data.webViewLink;

  if (!fileId || !fileUrl) {
    throw new Error("Drive upload did not return a file id/url");
  }

  return { fileId, fileUrl };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

export async function renameAndRefileDriveFile(params: {
  fileId: string;
  newName: string;
  targetFolderId: string;
}): Promise<void> {
  const drive = getDriveClient();

  const current = await drive.files.get({ fileId: params.fileId, fields: "parents" });
  const currentParents = current.data.parents ?? [];

  await drive.files.update({
    fileId: params.fileId,
    requestBody: { name: params.newName },
    addParents: currentParents.includes(params.targetFolderId) ? undefined : params.targetFolderId,
    removeParents: currentParents.filter((p) => p !== params.targetFolderId).join(",") || undefined,
  });
}
