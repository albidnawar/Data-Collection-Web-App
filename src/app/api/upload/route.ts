import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateFilename } from "@/lib/filename";
import { resolveOrCreateBadExecutionBrandFolder, resolveOrCreateBrandFolder, uploadPhotoToDrive } from "@/lib/driveFolders";
import { resolveOrCreateTag } from "@/lib/tagResolve";
import { isPhotoKind, type PhotoKind } from "@/lib/tagTypes";
import type { PhotoRecord } from "@/generated/prisma/client";

export const maxDuration = 60;

function requireString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

interface ClaimParams {
  clientQueueId: string;
  repId: string;
  brandId: string;
  kind: PhotoKind;
  isGoodExecution: boolean;
  categoryId: string | null;
  posmTypeId: string | null;
  skuTypeId: string | null;
  shopTypeId: string;
  gpsLat: number | null;
  gpsLng: number | null;
  address: string | null;
  surroundingRemarks: string | null;
  otherRemarks: string | null;
  shelfVacancy: boolean | null;
  capturedAt: Date;
  filename: string;
}

/**
 * Atomically claims the right to actually upload this clientQueueId, so two
 * near-simultaneous requests for the same photo (e.g. a page reload racing an
 * in-flight background sync, or two tabs open) can't both reach Drive and
 * create duplicate files. Mirrors the claim pattern already used for Drive
 * folder creation in driveFolders.ts.
 */
async function claimPhotoRecordForUpload(
  params: ClaimParams,
): Promise<{ record: PhotoRecord; alreadyUploaded: boolean } | { conflict: true }> {
  const data = {
    repId: params.repId,
    brandId: params.brandId,
    kind: params.kind,
    isGoodExecution: params.isGoodExecution,
    categoryId: params.categoryId,
    posmTypeId: params.posmTypeId,
    skuTypeId: params.skuTypeId,
    shopTypeId: params.shopTypeId,
    gpsLat: params.gpsLat,
    gpsLng: params.gpsLng,
    address: params.address,
    surroundingRemarks: params.surroundingRemarks,
    otherRemarks: params.otherRemarks,
    shelfVacancy: params.shelfVacancy,
    capturedAt: params.capturedAt,
    filename: params.filename,
  };

  try {
    const created = await prisma.photoRecord.create({
      data: { clientQueueId: params.clientQueueId, ...data, status: "uploading" },
    });
    return { record: created, alreadyUploaded: false };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  // Someone beat us to creating the row — figure out what state it's in.
  const existing = await prisma.photoRecord.findUniqueOrThrow({ where: { clientQueueId: params.clientQueueId } });

  if (existing.status === "uploaded") {
    return { record: existing, alreadyUploaded: true };
  }
  if (existing.status !== "failed") {
    // "uploading" (a race) or "pending" (shouldn't happen post-create) — another
    // request already owns this upload right now. Don't pile on.
    return { conflict: true };
  }

  // A genuine retry of a previously-failed upload — claim it, but only if
  // it's still "failed" by the time this UPDATE runs (guards a second
  // concurrent retry from also winning).
  const claim = await prisma.photoRecord.updateMany({
    where: { clientQueueId: params.clientQueueId, status: "failed" },
    data: { ...data, status: "uploading", errorMessage: null },
  });
  if (claim.count === 0) {
    return { conflict: true };
  }

  const record = await prisma.photoRecord.findUniqueOrThrow({ where: { clientQueueId: params.clientQueueId } });
  return { record, alreadyUploaded: false };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const clientQueueId = requireString(formData, "clientQueueId");
  const brandName = requireString(formData, "brandName");
  const categoryName = requireString(formData, "categoryName");
  const shopTypeName = requireString(formData, "shopTypeName");
  const capturedAtRaw = requireString(formData, "capturedAt");
  const kindRaw = requireString(formData, "kind");
  const isGoodExecutionRaw = requireString(formData, "isGoodExecution");
  const posmTypeName = requireString(formData, "posmTypeName");
  const skuTypeName = requireString(formData, "skuTypeName");
  const gpsLatRaw = formData.get("gpsLat");
  const gpsLngRaw = formData.get("gpsLng");
  const address = requireString(formData, "address");
  const surroundingRemarks = requireString(formData, "surroundingRemarks");
  const otherRemarks = requireString(formData, "otherRemarks");
  const shelfVacancyRaw = formData.get("shelfVacancy");
  const photo = formData.get("photo");

  if (
    !clientQueueId ||
    !brandName ||
    !shopTypeName ||
    !capturedAtRaw ||
    !(photo instanceof File) ||
    !isPhotoKind(kindRaw) ||
    (kindRaw === "posm" && !posmTypeName) ||
    (kindRaw === "category" && !categoryName) ||
    (kindRaw === "sku" && !skuTypeName) ||
    (isGoodExecutionRaw !== "true" && isGoodExecutionRaw !== "false")
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const kind = kindRaw;
  const isGoodExecution = isGoodExecutionRaw === "true";
  const capturedAt = new Date(capturedAtRaw);

  const [brand, category, shopType, posmType, skuType] = await Promise.all([
    resolveOrCreateTag("brand", brandName, session.user.id),
    kind === "category" && categoryName ? resolveOrCreateTag("category", categoryName, session.user.id) : Promise.resolve(null),
    resolveOrCreateTag("shopType", shopTypeName, session.user.id),
    kind === "posm" && posmTypeName ? resolveOrCreateTag("posmType", posmTypeName, session.user.id) : Promise.resolve(null),
    kind === "sku" && skuTypeName ? resolveOrCreateTag("skuType", skuTypeName, session.user.id) : Promise.resolve(null),
  ]);

  const typeName =
    kind === "posm" ? (posmType?.name ?? "") : kind === "category" ? (category?.name ?? "") : (skuType?.name ?? "");

  const filename = generateFilename(
    {
      brand: brand.name,
      kind,
      typeName,
      shopType: shopType.name,
    },
    capturedAt,
  );

  const gpsLat = gpsLatRaw ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw ? Number(gpsLngRaw) : null;
  const shelfVacancy = shelfVacancyRaw === "true" ? true : shelfVacancyRaw === "false" ? false : null;

  const claimed = await claimPhotoRecordForUpload({
    clientQueueId,
    repId: session.user.id,
    brandId: brand.id,
    kind,
    isGoodExecution,
    categoryId: category?.id ?? null,
    posmTypeId: posmType?.id ?? null,
    skuTypeId: skuType?.id ?? null,
    shopTypeId: shopType.id,
    gpsLat,
    gpsLng,
    address,
    surroundingRemarks,
    otherRemarks,
    shelfVacancy,
    capturedAt,
    filename,
  });

  if ("conflict" in claimed) {
    return NextResponse.json(
      { error: "Another request is already uploading this photo" },
      { status: 409 },
    );
  }
  if (claimed.alreadyUploaded) {
    return NextResponse.json({ photoRecord: claimed.record });
  }
  const photoRecord = claimed.record;

  try {
    const folderId = isGoodExecution
      ? await resolveOrCreateBrandFolder(brand.id, brand.name)
      : await resolveOrCreateBadExecutionBrandFolder(brand.id, brand.name);
    const fileBuffer = Buffer.from(await photo.arrayBuffer());
    if (fileBuffer.length === 0) {
      // Seen with photos that sat a long time in the offline queue — the
      // browser's stored Blob reference can come back empty on read. Fail
      // loudly instead of silently creating a 0-byte Drive file that looks
      // like a successful upload until someone tries to open it.
      throw new Error("Photo file was empty when uploading — please retake this photo");
    }
    const { fileId, fileUrl } = await uploadPhotoToDrive({ folderId, filename, fileBuffer });

    const updated = await prisma.photoRecord.update({
      where: { id: photoRecord.id },
      data: {
        status: "uploaded",
        driveFileId: fileId,
        driveFileUrl: fileUrl,
        uploadedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({ photoRecord: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    await prisma.photoRecord.update({
      where: { id: photoRecord.id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
