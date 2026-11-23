import { NextResponse, type NextRequest } from "next/server";
import { UNLOCK_COOKIE, expectedUnlockCookieValue } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const unlocked = request.cookies.get(UNLOCK_COOKIE)?.value === (await expectedUnlockCookieValue());
  if (unlocked) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except static assets/image optimization — those must load
  // unauthenticated or the /login page itself can't render.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
