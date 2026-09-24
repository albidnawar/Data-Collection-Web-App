import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateFilename } from "@/lib/filename";
import { resolveOrCreateBrandFolder, uploadPhotoToDrive } from "@/lib/driveFolders";

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
  const shopName = requireString(formData, "shopName");
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
    !categoryName ||
    !shopTypeName ||
    !shopName ||
    !capturedAtRaw ||
    !(photo instanceof File)
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const capturedAt = new Date(capturedAtRaw);

  const existing = await prisma.photoRecord.findUnique({ where: { clientQueueId } });
  if (existing?.status === "uploaded") {
    return NextResponse.json({ photoRecord: existing });
  }

  const [brand, category, shopType, posmType] = await Promise.all([
    prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName, createdById: session.user.id },
    }),
    prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName, createdById: session.user.id },
    }),
    prisma.shopType.upsert({
      where: { name: shopTypeName },
      update: {},
      create: { name: shopTypeName, createdById: session.user.id },
    }),
    isPosm && posmTypeName
      ? prisma.posmType.upsert({
          where: { name: posmTypeName },
          update: {},
          create: { name: posmTypeName, createdById: session.user.id },
        })
      : Promise.resolve(null),
  ]);

  const filename = generateFilename(
    {
      brand: brandName,
      isPosm,
      posmType: isPosm ? posmTypeName : null,
      shopType: shopTypeName,
    },
    capturedAt,
  );

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
      categoryId: category.id,
      posmTypeId: posmType?.id ?? null,
      shopTypeId: shopType.id,
      shopName,
      gpsLat: gpsLatRaw ? Number(gpsLatRaw) : null,
      gpsLng: gpsLngRaw ? Number(gpsLngRaw) : null,
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
