"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function addRepAction(_prevState: string | undefined, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name");
  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof name !== "string" || typeof username !== "string" || typeof password !== "string") {
    return "All fields are required.";
  }
  if (name.trim().length === 0 || username.trim().length === 0 || password.length < 6) {
    return "Name and username are required; password must be at least 6 characters.";
  }

  const existing = await prisma.rep.findUnique({ where: { username: username.trim() } });
  if (existing) {
    return "That username is already taken.";
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.rep.create({
    data: { name: name.trim(), username: username.trim(), passwordHash },
  });

  revalidatePath("/admin/reps");
  return undefined;
}

export async function toggleRepActiveAction(repId: string, active: boolean) {
  await requireAdmin();
  await prisma.rep.update({ where: { id: repId }, data: { active } });
  revalidatePath("/admin/reps");
}

export async function toggleRepAdminAction(repId: string, isAdmin: boolean) {
  await requireAdmin();
  await prisma.rep.update({ where: { id: repId }, data: { isAdmin } });
  revalidatePath("/admin/reps");
}

export async function editRepAction(repId: string, _prevState: string | undefined, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name");
  const username = formData.get("username");
  if (typeof name !== "string" || typeof username !== "string") return "Name and username are required.";
  if (name.trim().length === 0 || username.trim().length === 0) return "Name and username are required.";

  const existing = await prisma.rep.findUnique({ where: { username: username.trim() } });
  if (existing && existing.id !== repId) return "That username is already taken.";

  await prisma.rep.update({ where: { id: repId }, data: { name: name.trim(), username: username.trim() } });
  revalidatePath("/admin/reps");
  return undefined;
}

export async function changeRepPasswordAction(repId: string, _prevState: string | undefined, formData: FormData) {
  await requireAdmin();

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 6) return "Password must be at least 6 characters.";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.rep.update({ where: { id: repId }, data: { passwordHash } });
  revalidatePath("/admin/reps");
  return undefined;
}

export async function deleteRepAction(repId: string) {
  await requireAdmin();

  const photoCount = await prisma.photoRecord.count({ where: { repId } });
  if (photoCount > 0) {
    throw new Error(
      `This rep has ${photoCount} photo${photoCount === 1 ? "" : "s"} on record and can't be deleted — deactivate them instead.`,
    );
  }

  await prisma.rep.delete({ where: { id: repId } });
  revalidatePath("/admin/reps");
}
