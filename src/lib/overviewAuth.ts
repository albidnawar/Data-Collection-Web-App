import crypto from "node:crypto";

export const OVERVIEW_COOKIE = "overview_unlocked";

// Deterministic, not a per-session secret: this gate gives read-only access
// to aggregate counts, not an account, so a fixed signed marker (rather than
// a database-backed session) is enough to stop someone from just typing in
// an arbitrary cookie value.
export function expectedOverviewCookieValue(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update("public-overview-unlock").digest("hex");
}
