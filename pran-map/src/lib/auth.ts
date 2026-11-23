export const UNLOCK_COOKIE = "pran_map_unlocked";

// Web Crypto (not node:crypto) so this also works from the Edge-runtime
// middleware, not just Node API routes.
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Deterministic, not a per-session secret: this gate gives read-only access
// to one shared password, not an account, so a fixed signed marker (rather
// than a database-backed session) is enough to stop someone from just typing
// in an arbitrary cookie value.
export function expectedUnlockCookieValue(): Promise<string> {
  const secret = process.env.COOKIE_SECRET ?? "";
  return hmacSha256Hex(secret, "pran-map-unlock");
}
