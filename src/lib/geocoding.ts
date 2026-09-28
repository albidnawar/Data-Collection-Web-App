const RAW_COORD_DECIMALS = 5;

/** Plain "lat, lng" text used to display a photo's GPS fix. */
export function formatRawCoords(lat: number, lng: number): string {
  return `${lat.toFixed(RAW_COORD_DECIMALS)}, ${lng.toFixed(RAW_COORD_DECIMALS)}`;
}
