export interface ParsedOutletRow {
  code: string;
  lat: number;
  lng: number;
}

export interface ParsedOutletCsv {
  rows: ParsedOutletRow[];
  skipped: number;
}

const CODE_HEADERS = ["code", "outlet code", "outletcode"];
const LAT_HEADERS = ["lat", "latitude"];
const LNG_HEADERS = ["lng", "long", "longitude"];

function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.includes(h));
}

/** Parses a simple fixed-column CSV (outlet code, lat, lng) with a header row.
 * Column order and casing are flexible (lat/latitude, lng/long/longitude), but
 * this isn't a general-purpose CSV parser — it assumes plain comma-separated
 * values with no embedded commas/quotes, which is all outlet codes and
 * coordinates ever need. Invalid rows are skipped and counted, not fatal. */
export function parseOutletCsv(text: string): ParsedOutletCsv {
  const lines = text.split(/\r\n|\r|\n/).map((line) => line.trim());
  const nonEmpty = lines.filter((line) => line.length > 0);
  if (nonEmpty.length === 0) return { rows: [], skipped: 0 };

  const headers = nonEmpty[0].split(",").map((h) => h.trim().toLowerCase());
  const codeIdx = findColumn(headers, CODE_HEADERS);
  const latIdx = findColumn(headers, LAT_HEADERS);
  const lngIdx = findColumn(headers, LNG_HEADERS);

  if (codeIdx === -1 || latIdx === -1 || lngIdx === -1) {
    throw new Error('CSV must have a header row with "code", "lat", and "lng" columns (latitude/longitude also accepted).');
  }

  const rows: ParsedOutletRow[] = [];
  let skipped = 0;

  for (const line of nonEmpty.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const code = cols[codeIdx];
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);

    if (!code || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      skipped += 1;
      continue;
    }

    rows.push({ code, lat, lng });
  }

  return { rows, skipped };
}
