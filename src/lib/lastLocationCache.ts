const STORAGE_KEY = "fieldlenz.lastGeocodedLocation";

export interface LastLocation {
  lat: number;
  lng: number;
  address: string;
}

export function getLastLocation(): LastLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastLocation;
  } catch {
    return null;
  }
}

export function setLastLocation(location: LastLocation) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // localStorage unavailable — the proximity check just won't persist across reloads
  }
}
