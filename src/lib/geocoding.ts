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
