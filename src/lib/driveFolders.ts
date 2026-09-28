import { getDriveClient } from "@/lib/driveClient";
import { prisma } from "@/lib/db";

function rootFolderId(): string {
  const id = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new Error("Missing DRIVE_ROOT_FOLDER_ID environment variable");
  return id;
}

// Sentinel written into a Brand's folder-id column while one request is in the middle
// of creating that folder, so a concurrent request for the same never-before-seen
// brand waits for and reuses that folder instead of racing to create a second one.
// Never a real Drive file id, so it can't be confused with one.
const PENDING_FOLDER_MARKER = "__pending__";
const CLAIM_POLL_INTERVAL_MS = 300;
const CLAIM_MAX_WAIT_MS = 15000;

type BrandFolderColumn = "driveFolderId" | "badExecutionDriveFolderId";

async function waitForClaimedBrandFolderId(brandId: string, column: BrandFolderColumn): Promise<string> {
  const deadline = Date.now() + CLAIM_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    const value = brand?.[column];
    if (value && value !== PENDING_FOLDER_MARKER) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, CLAIM_POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for another upload to finish creating this brand's Drive folder");
}

async function resolveOrCreateBrandFolderIn(params: {
  brandId: string;
  brandName: string;
  parentFolderId: string;
  column: BrandFolderColumn;
}): Promise<string> {
  const { brandId, brandName, parentFolderId, column } = params;

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  const existingValue = brand?.[column];
  if (existingValue && existingValue !== PENDING_FOLDER_MARKER) {
    return existingValue;
  }

  // Atomically claim the right to create this folder: the WHERE clause makes this a
  // single conditional UPDATE, so only one concurrent request can ever "win" when two
  // uploads hit a brand that's never had this folder before.
  const claim = await prisma.brand.updateMany({
    where: { id: brandId, [column]: null },
    data: { [column]: PENDING_FOLDER_MARKER },
  });

  if (claim.count === 0) {
    return waitForClaimedBrandFolderId(brandId, column);
  }

  try {
    const drive = getDriveClient();

    const escapedName = brandName.replace(/'/g, "\\'");
    const existing = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    let folderId = existing.data.files?.[0]?.id;

    if (!folderId) {
      const created = await drive.files.create({
        requestBody: {
          name: brandName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        },
        fields: "id",
      });
      folderId = created.data.id ?? undefined;
    }

    if (!folderId) {
      throw new Error(`Failed to resolve or create Drive folder for brand "${brandName}"`);
    }

    await prisma.brand.update({ where: { id: brandId }, data: { [column]: folderId } });

    return folderId;
  } catch (error) {
    // Release the claim so a later retry isn't stuck waiting forever on a folder
    // that never actually got created.
    await prisma.brand.updateMany({
      where: { id: brandId, [column]: PENDING_FOLDER_MARKER },
      data: { [column]: null },
    });
    throw error;
  }
}

export async function resolveOrCreateBrandFolder(brandId: string, brandName: string): Promise<string> {
  return resolveOrCreateBrandFolderIn({
    brandId,
    brandName,
    parentFolderId: rootFolderId(),
    column: "driveFolderId",
  });
}

const ATTENDANCE_FOLDER_NAME = "Attendance";
const BAD_EXECUTION_FOLDER_NAME = "Bad Execution";
// Warm-instance-only caches: harmless to re-resolve on a cold start, and each of
// these top-level folders is only ever created once (the first time it's needed
// after this shipped), so the brand-folder claim dance above isn't needed here.
let attendanceFolderIdCache: string | null = null;
let badExecutionRootFolderIdCache: string | null = null;

async function resolveOrCreateNamedRootFolder(name: string): Promise<string> {
  const drive = getDriveClient();
  const root = rootFolderId();

  const existing = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${root}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  let folderId = existing.data.files?.[0]?.id;

  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [root],
      },
      fields: "id",
    });
    folderId = created.data.id ?? undefined;
  }

  if (!folderId) {
    throw new Error(`Failed to resolve or create the "${name}" Drive folder`);
  }

  return folderId;
}

export async function resolveOrCreateAttendanceFolder(): Promise<string> {
  if (attendanceFolderIdCache) return attendanceFolderIdCache;
  attendanceFolderIdCache = await resolveOrCreateNamedRootFolder(ATTENDANCE_FOLDER_NAME);
  return attendanceFolderIdCache;
}

async function resolveOrCreateBadExecutionRootFolder(): Promise<string> {
  if (badExecutionRootFolderIdCache) return badExecutionRootFolderIdCache;
  badExecutionRootFolderIdCache = await resolveOrCreateNamedRootFolder(BAD_EXECUTION_FOLDER_NAME);
  return badExecutionRootFolderIdCache;
}

/** Same brand folder concept as resolveOrCreateBrandFolder, but nested under a
 * top-level "Bad Execution" folder — so bad executions are organized by brand,
 * separately from normal (good) execution photos. */
export async function resolveOrCreateBadExecutionBrandFolder(brandId: string, brandName: string): Promise<string> {
  const parentFolderId = await resolveOrCreateBadExecutionRootFolder();
  return resolveOrCreateBrandFolderIn({
    brandId,
    brandName,
    parentFolderId,
    column: "badExecutionDriveFolderId",
  });
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
}): Promise<{ removedParentIds: string[] }> {
  const drive = getDriveClient();

  const current = await drive.files.get({ fileId: params.fileId, fields: "parents" });
  const currentParents = current.data.parents ?? [];
  const removedParentIds = currentParents.filter((p) => p !== params.targetFolderId);

  await drive.files.update({
    fileId: params.fileId,
    requestBody: { name: params.newName },
    addParents: currentParents.includes(params.targetFolderId) ? undefined : params.targetFolderId,
    removeParents: removedParentIds.join(",") || undefined,
  });

  return { removedParentIds };
}

function isRealFolderId(id: string | null | undefined): id is string {
  return !!id && id !== PENDING_FOLDER_MARKER;
}

/** Deletes a brand's Drive folder once it has no photos left in it — and clears
 * the DB's reference to it, so the next upload for that brand creates a fresh one. */
export async function deleteDriveFolderIfEmpty(folderId: string | null | undefined): Promise<void> {
  if (!isRealFolderId(folderId)) return;

  try {
    const drive = getDriveClient();
    const remaining = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id)",
      pageSize: 1,
      spaces: "drive",
    });
    if ((remaining.data.files?.length ?? 0) > 0) return;

    await drive.files.delete({ fileId: folderId });
    await prisma.brand.updateMany({ where: { driveFolderId: folderId }, data: { driveFolderId: null } });
    await prisma.brand.updateMany({
      where: { badExecutionDriveFolderId: folderId },
      data: { badExecutionDriveFolderId: null },
    });
  } catch {
    // Folder already gone, inaccessible, or a race re-populated it — safe to leave alone.
  }
}

/** Checks whether a brand has any (good or bad execution) photos left, and if not,
 * cleans up whichever of its now-empty Drive folders that applies to. */
export async function cleanupEmptyBrandFolder(brandId: string): Promise<void> {
  const [goodRemaining, badRemaining, brand] = await Promise.all([
    prisma.photoRecord.count({ where: { brandId, isGoodExecution: true } }),
    prisma.photoRecord.count({ where: { brandId, isGoodExecution: false } }),
    prisma.brand.findUnique({ where: { id: brandId }, select: { driveFolderId: true, badExecutionDriveFolderId: true } }),
  ]);

  if (goodRemaining === 0) await deleteDriveFolderIfEmpty(brand?.driveFolderId);
  if (badRemaining === 0) await deleteDriveFolderIfEmpty(brand?.badExecutionDriveFolderId);
}
