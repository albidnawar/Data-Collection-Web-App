import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isTagType } from "@/lib/tagTypes";
import { resolveOrCreateTag } from "@/lib/tagResolve";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [brands, categories, posmTypes, skuTypes, shopTypes] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.posmType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.skuType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.shopType.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return NextResponse.json({ brands, categories, posmTypes, skuTypes, shopTypes });
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

  const tag = await resolveOrCreateTag(type, name, session.user.id);

  return NextResponse.json({ tag });
}
