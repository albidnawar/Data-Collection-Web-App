import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

// Demo/sandbox only: signs in as the fixed demo account server-side, so
// visitors land straight on the capture screen with no login form at all.
export async function GET(request: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const username = process.env.DEMO_USERNAME;
  const password = process.env.DEMO_PASSWORD;
  if (!username || !password) {
    return NextResponse.json({ error: "Demo credentials are not configured" }, { status: 500 });
  }

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Demo credentials are invalid" }, { status: 500 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/", request.url));
}
