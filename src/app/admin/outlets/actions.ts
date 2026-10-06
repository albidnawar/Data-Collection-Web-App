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

  // A single INSERT ... ON CONFLICT statement can't touch the same conflict
  // target (code) twice, so if the same code appears more than once in the
  // file, keep only its last occurrence — same result as upserting each row
  // one at a time in file order, just in one statement per batch.
  const byCode = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) byCode.set(row.code, row);
  const rows = Array.from(byCode.values());
  const duplicateCount = parsed.rows.length - rows.length;

  const now = new Date();
  try {
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
          const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
          const values = batch.map(
            (row) =>
              Prisma.sql`(${randomUUID()}, ${row.code}, ${row.town}, ${row.lat}, ${row.lng}, ${brandId}, ${adminId}, true, ${now})`,
          );
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "Outlet" (id, code, town, lat, lng, "brandId", "createdById", active, "createdAt")
            VALUES ${Prisma.join(values)}
            ON CONFLICT (code) DO UPDATE SET town = excluded.town, lat = excluded.lat, lng = excluded.lng, "brandId" = excluded."brandId"
          `);
        }
      },
      { timeout: 50000 },
    );
  } catch (err) {
    return {
      ok: false,
      message: `Import failed, nothing was saved: ${err instanceof Error ? err.message : "unexpected database error"}.`,
    };
  }

  revalidatePath("/admin/outlets");
  revalidatePath("/map");

  const notes = [
    parsed.skipped > 0 ? `skipped ${parsed.skipped} invalid row${parsed.skipped === 1 ? "" : "s"}` : null,
    duplicateCount > 0 ? `${duplicateCount} duplicate code${duplicateCount === 1 ? "" : "s"} collapsed to their last row` : null,
  ].filter(Boolean);
  const note = notes.length > 0 ? `, ${notes.join(", ")}` : "";

  return {
    ok: true,
    message: `Imported ${rows.length} outlet${rows.length === 1 ? "" : "s"} for ${brand.name}${note}.`,
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
