import { NextResponse } from "next/server";
import { UNLOCK_COOKIE, expectedUnlockCookieValue } from "@/lib/auth";

export async function POST(request: Request) {
  const expectedPassword = process.env.MAP_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json({ error: "Map is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password !== expectedPassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(UNLOCK_COOKIE, await expectedUnlockCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
