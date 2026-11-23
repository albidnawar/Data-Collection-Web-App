// Shared-secret check for the separately-hosted Pran execution map app (see
// pran-map/ at the repo root) — that app has no NextAuth session here, so it
// authenticates server-to-server with a static key instead, sent as the
// x-pran-map-key header. Returns false (treat as unauthorized) if the env var
// itself isn't set, same "feature off unless configured" behavior as
// OVERVIEW_PASSWORD.
export function pranMapKeyValid(request: Request): boolean {
  const expected = process.env.PRAN_MAP_API_KEY;
  if (!expected) return false;
  return request.headers.get("x-pran-map-key") === expected;
}

// Allows these endpoints to also be called directly from a browser on a
// different origin — e.g. a standalone static HTML build of the map that
// has no server of its own to proxy through. The x-pran-map-key value is
// the only thing guarding the data either way, so a permissive origin here
// doesn't weaken anything beyond what embedding that key client-side
// already does.
export const PRAN_MAP_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-pran-map-key",
  "Access-Control-Max-Age": "86400",
};
