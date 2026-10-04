// Shared state for the two-stage guided tour (capture screen, then admin
// dashboard). A plain client-side flag, not real app state, so sessionStorage
// is the right home for it — it just needs to survive one client-side
// navigation between the two tour components below.

export const TOUR_DONE_KEY = "camtag.tourDone";
export const TOUR_STAGE_KEY = "camtag.tourStage";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function hasTourRun(): boolean {
  try {
    return window.localStorage.getItem(TOUR_DONE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTourDone() {
  try {
    window.localStorage.setItem(TOUR_DONE_KEY, "true");
  } catch {
    // ignore — worst case the tour just runs again next visit
  }
}

export function setTourStage(stage: "admin") {
  try {
    window.sessionStorage.setItem(TOUR_STAGE_KEY, stage);
  } catch {
    // ignore
  }
}

export function consumeTourStage(expected: "admin"): boolean {
  try {
    const value = window.sessionStorage.getItem(TOUR_STAGE_KEY);
    if (value !== expected) return false;
    window.sessionStorage.removeItem(TOUR_STAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
