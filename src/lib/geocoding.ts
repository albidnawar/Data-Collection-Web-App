const RAW_COORD_DECIMALS = 5;

/** The plain "lat, lng" text used as an immediate fallback before/instead of a geocoded address. */
export function formatRawCoords(lat: number, lng: number): string {
  return `${lat.toFixed(RAW_COORD_DECIMALS)}, ${lng.toFixed(RAW_COORD_DECIMALS)}`;
}

/**
 * True when `address` is empty, or is still exactly the raw-coordinates fallback for
 * this lat/lng — i.e. it was never actually geocoded or manually edited by the rep.
 */
export function isRawCoordsAddress(address: string | null | undefined, lat: number, lng: number): boolean {
  if (!address || address.trim().length === 0) return true;
  return address.trim() === formatRawCoords(lat, lng);
}

/** Photos captured within this many meters of an already-geocoded point reuse its address. */
export const NEARBY_RADIUS_METERS = 50;

const EARTH_RADIUS_METERS = 6371000;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}
