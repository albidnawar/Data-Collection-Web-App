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
