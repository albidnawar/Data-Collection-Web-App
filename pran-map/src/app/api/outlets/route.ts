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

  const upstream = await fetch(target, {
    headers: { "x-pran-map-key": apiKey },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to load outlets." }, { status: 502 });
  }

  const data = await upstream.json();
  return NextResponse.json(data);
}
