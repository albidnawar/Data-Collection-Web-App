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
