import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isTagType, type TagType } from "@/lib/tagTypes";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [brands, categories, posmTypes, shopTypes] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.posmType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.shopType.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return NextResponse.json({ brands, categories, posmTypes, shopTypes });
}

async function upsertTag(type: TagType, name: string, createdById: string) {
  const create = { name, createdById };
  switch (type) {
    case "brand":
      return prisma.brand.upsert({ where: { name }, update: {}, create });
    case "category":
      return prisma.category.upsert({ where: { name }, update: {}, create });
    case "posmType":
      return prisma.posmType.upsert({ where: { name }, update: {}, create });
    case "shopType":
      return prisma.shopType.upsert({ where: { name }, update: {}, create });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!isTagType(type) || name.length === 0) {
    return NextResponse.json({ error: "Invalid type or name" }, { status: 400 });
  }

  const tag = await upsertTag(type, name, session.user.id);

  return NextResponse.json({ tag });
}
