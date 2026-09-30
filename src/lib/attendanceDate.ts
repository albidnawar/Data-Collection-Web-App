const DHAKA_OFFSET_MINUTES = 6 * 60;

/** "YYYY-MM-DD" for the given instant in Asia/Dhaka time (UTC+6, no DST), so a
 * rep's attendance day boundary lands at their actual local midnight rather
 * than server UTC midnight. */
export function getDhakaDateKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The [start, end) UTC instant range covering "today" in Asia/Dhaka time,
 * for querying UTC-stored timestamp columns against a Dhaka-local day. */
export function getDhakaDayBoundsUtc(date: Date = new Date()): { start: Date; end: Date } {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  const startOfShiftedDayUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const start = new Date(startOfShiftedDayUtcMs - DHAKA_OFFSET_MINUTES * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
