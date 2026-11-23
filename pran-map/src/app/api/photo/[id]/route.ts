import { NextResponse } from "next/server";

// Proxies the main app's /api/pran-map/photo/[id] image bytes, attaching the
// shared secret server-side so it never reaches the browser.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const mainAppUrl = process.env.MAIN_APP_URL;
  const apiKey = process.env.PRAN_MAP_API_KEY;
  if (!mainAppUrl || !apiKey) {
    return new NextResponse(null, { status: 503 });
  }

  const { id } = await params;
  const target = new URL(`/api/pran-map/photo/${id}`, mainAppUrl);
  target.search = new URL(request.url).search;

  const upstream = await fetch(target, {
    headers: { "x-pran-map-key": apiKey },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
