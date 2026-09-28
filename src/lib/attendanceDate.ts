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
