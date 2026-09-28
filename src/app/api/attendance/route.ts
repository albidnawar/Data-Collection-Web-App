import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordClockIn, recordClockOut } from "@/lib/attendance";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const kind = formData.get("kind");
  const photo = formData.get("photo");
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const addressRaw = formData.get("address");

  if ((kind !== "clockin" && kind !== "clockout") || !(photo instanceof File)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const lat = typeof latRaw === "string" && latRaw ? Number(latRaw) : null;
  const lng = typeof lngRaw === "string" && lngRaw ? Number(lngRaw) : null;
  const address = typeof addressRaw === "string" && addressRaw ? addressRaw : null;
  const photoBuffer = Buffer.from(await photo.arrayBuffer());

  const params = {
    repId: session.user.id,
    repName: session.user.name ?? session.user.username,
    lat,
    lng,
    address,
    photoBuffer,
  };

  try {
    const attendance = kind === "clockin" ? await recordClockIn(params) : await recordClockOut(params);
    return NextResponse.json({ attendance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record attendance";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
