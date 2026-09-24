import { getDriveClient } from "@/lib/driveClient";
import { prisma } from "@/lib/db";

function rootFolderId(): string {
  const id = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new Error("Missing DRIVE_ROOT_FOLDER_ID environment variable");
  return id;
}

export async function resolveOrCreateBrandFolder(brandId: string, brandName: string): Promise<string> {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (brand?.driveFolderId) {
    return brand.driveFolderId;
  }

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
