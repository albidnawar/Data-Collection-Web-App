"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parseOutletCsv } from "@/lib/outletCsv";

const UPSERT_BATCH_SIZE = 500;

async function requireAdminId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
}

export interface ImportOutletsResult {
  ok: boolean;
  message: string;
}

export async function importOutletsAction(
  _prevState: ImportOutletsResult | undefined,
  formData: FormData,
): Promise<ImportOutletsResult> {
  const adminId = await requireAdminId();

  const brandId = formData.get("brandId");
  const file = formData.get("file");

  if (typeof brandId !== "string" || !brandId) {
    return { ok: false, message: "Select a brand." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a CSV file." };
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { ok: false, message: "Brand not found." };

  let parsed;
  try {
    parsed = parseOutletCsv(await file.text());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not parse that CSV." };
  }

  if (parsed.rows.length === 0) {
    return { ok: false, message: "No valid outlet rows found in that file." };
  }

  const now = new Date();
  for (let i = 0; i < parsed.rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = parsed.rows.slice(i, i + UPSERT_BATCH_SIZE);
    const values = batch.map(
      (row) => Prisma.sql`(${randomUUID()}, ${row.code}, ${row.lat}, ${row.lng}, ${brandId}, ${adminId}, true, ${now})`,
    );
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Outlet" (id, code, lat, lng, "brandId", "createdById", active, "createdAt")
      VALUES ${Prisma.join(values)}
      ON CONFLICT (code) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, "brandId" = excluded."brandId"
    `);
  }

  revalidatePath("/admin/outlets");
  revalidatePath("/map");

  const skippedNote = parsed.skipped > 0 ? `, skipped ${parsed.skipped} invalid row${parsed.skipped === 1 ? "" : "s"}` : "";
  return {
    ok: true,
    message: `Imported ${parsed.rows.length} outlet${parsed.rows.length === 1 ? "" : "s"} for ${brand.name}${skippedNote}.`,
  };
}

export async function toggleOutletActiveAction(id: string, active: boolean) {
  await requireAdminId();
  await prisma.outlet.update({ where: { id }, data: { active } });
  revalidatePath("/admin/outlets");
  revalidatePath("/map");
}

export async function deleteOutletAction(id: string) {
  await requireAdminId();
  await prisma.outlet.delete({ where: { id } });
  revalidatePath("/admin/outlets");
  revalidatePath("/map");
}
