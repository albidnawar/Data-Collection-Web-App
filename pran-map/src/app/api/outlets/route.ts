import { NextResponse } from "next/server";

// Proxies the main app's /api/pran-map/outlets, attaching the shared secret
// server-side so it never reaches the browser. Query params (dateFrom/dateTo
// etc.) are passed straight through.
export async function GET(request: Request) {
  const mainAppUrl = process.env.MAIN_APP_URL;
  const apiKey = process.env.PRAN_MAP_API_KEY;
  if (!mainAppUrl || !apiKey) {
    return NextResponse.json({ error: "Map is not configured." }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = new URL("/api/pran-map/outlets", mainAppUrl);
  target.search = incoming.search;

  // Bounds this function's own runtime: without it, a slow/cold main app
  // could leave this request hanging for minutes (this project's default
  // function timeout) instead of failing fast with a retriable error.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(target, {
      headers: { "x-pran-map-key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to load outlets." }, { status: 502 });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "The main app took too long to respond." : "Failed to load outlets." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
