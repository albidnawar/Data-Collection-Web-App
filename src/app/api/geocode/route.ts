import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reverseGeocode } from "@/lib/reverseGeocode";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const address = await reverseGeocode(lat, lng);
  return NextResponse.json({ address });
}
