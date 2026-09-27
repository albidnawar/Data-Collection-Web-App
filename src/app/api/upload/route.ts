import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateFilename } from "@/lib/filename";
import { resolveOrCreateBrandFolder, uploadPhotoToDrive } from "@/lib/driveFolders";
import { resolveOrCreateTag } from "@/lib/tagResolve";

export const maxDuration = 60;

function requireString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
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
  const isPosm = formData.get("isPosm") === "true";
  const posmTypeName = requireString(formData, "posmTypeName");
  const gpsLatRaw = formData.get("gpsLat");
  const gpsLngRaw = formData.get("gpsLng");
  const address = requireString(formData, "address");
  const photo = formData.get("photo");

  if (
    !clientQueueId ||
    !brandName ||
    !shopTypeName ||
    !capturedAtRaw ||
    !(photo instanceof File) ||
    (isPosm && !posmTypeName) ||
    (!isPosm && !categoryName)
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const capturedAt = new Date(capturedAtRaw);

  const existing = await prisma.photoRecord.findUnique({ where: { clientQueueId } });
  if (existing?.status === "uploaded") {
    return NextResponse.json({ photoRecord: existing });
  }

  const [brand, category, shopType, posmType] = await Promise.all([
    resolveOrCreateTag("brand", brandName, session.user.id),
    !isPosm && categoryName ? resolveOrCreateTag("category", categoryName, session.user.id) : Promise.resolve(null),
    resolveOrCreateTag("shopType", shopTypeName, session.user.id),
    isPosm && posmTypeName ? resolveOrCreateTag("posmType", posmTypeName, session.user.id) : Promise.resolve(null),
  ]);

  const filename = generateFilename(
    {
      brand: brand.name,
      isPosm,
      typeName: isPosm ? (posmType?.name ?? "") : (category?.name ?? ""),
      shopType: shopType.name,
    },
    capturedAt,
  );

  const gpsLat = gpsLatRaw ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw ? Number(gpsLngRaw) : null;

  const photoRecord = await prisma.photoRecord.upsert({
    where: { clientQueueId },
    update: {
      status: "uploading",
      errorMessage: null,
    },
    create: {
      clientQueueId,
      repId: session.user.id,
      brandId: brand.id,
      isPosm,
      categoryId: category?.id ?? null,
      posmTypeId: posmType?.id ?? null,
      shopTypeId: shopType.id,
      gpsLat,
      gpsLng,
      address,
      capturedAt,
      filename,
      status: "uploading",
    },
  });

  try {
    const folderId = await resolveOrCreateBrandFolder(brand.id, brand.name);
    const fileBuffer = Buffer.from(await photo.arrayBuffer());
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
