// Server-only: turns GPS coordinates into a human-readable address using OpenStreetMap's
// free Nominatim reverse-geocoding service (no API key, no signup). Returns null (never
// throws) on any failure so callers can always fall back to raw coordinates.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires a descriptive User-Agent and asks for max ~1 request/second, both of which
// comfortably fit this app's volume. If usage ever grows enough to need a dedicated
// rate limit instead of the shared public instance, LocationIQ (locationiq.com) serves
// the same OSM data with a free 5,000/day tier — swap the url/host below for theirs.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Fieldlenz Photo Collection App (contact via app admin)" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
