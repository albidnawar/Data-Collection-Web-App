import { prisma } from "@/lib/db";
import { NEARBY_RADIUS_METERS, haversineDistanceMeters, isRawCoordsAddress } from "@/lib/geocoding";

// Server-only: calls Google's Geocoding API to turn GPS coordinates into a
// human-readable address. Requires GOOGLE_MAPS_API_KEY; returns null (never throws)
// if the key isn't configured, the request fails, or Google finds no match, so
// callers can always fall back to the raw coordinates.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "OK") return null;

    return data.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_LOOKUP_LIMIT = 20;

/**
 * Looks for one of this rep's own recently-uploaded photos within NEARBY_RADIUS_METERS
 * of (lat, lng) that already has a real (non-raw-coordinates) address, so a batch of
 * offline-captured photos from the same store only needs one billable geocode call.
 */
export async function findNearbyRecentAddress(repId: string, lat: number, lng: number): Promise<string | null> {
  const recent = await prisma.photoRecord.findMany({
    where: {
      repId,
      gpsLat: { not: null },
      gpsLng: { not: null },
      address: { not: null },
      capturedAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) },
    },
    orderBy: { capturedAt: "desc" },
    take: RECENT_LOOKUP_LIMIT,
    select: { gpsLat: true, gpsLng: true, address: true },
  });

  for (const record of recent) {
    if (record.gpsLat === null || record.gpsLng === null || !record.address) continue;
    if (isRawCoordsAddress(record.address, record.gpsLat, record.gpsLng)) continue;
    if (haversineDistanceMeters(lat, lng, record.gpsLat, record.gpsLng) <= NEARBY_RADIUS_METERS) {
      return record.address;
    }
  }

  return null;
}
