import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(function proxy(req) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = !!req.auth?.user?.isAdmin;

  // Public, password-gated read-only overview — its own access check lives
  // in the page itself, not NextAuth, so it's exempt from every rule below.
  if (pathname.startsWith("/overview")) {
    return NextResponse.next();
  }

  // Demo/sandbox only: silently sign in as a fixed demo account instead of
  // ever showing the login form. Inert unless DEMO_MODE is set, so production
  // is unaffected.
  if (process.env.DEMO_MODE === "true" && pathname === "/auto-login") {
    return NextResponse.next();
  }
  if (process.env.DEMO_MODE === "true" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auto-login", req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && pathname !== "/login" && pathname !== "/offline") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|logo-blue.png|logo-white.png).*)"],
};
