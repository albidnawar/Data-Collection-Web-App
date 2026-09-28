export interface GeoResult {
  lat: number;
  lng: number;
}

export type GeoOutcome =
  | { status: "success"; result: GeoResult }
  | { status: "denied" }
  | { status: "unavailable" };

const HIGH_ACCURACY_TIMEOUT_MS = 5000;
const LOW_ACCURACY_TIMEOUT_MS = 10000;

function toOutcome(position: GeolocationPosition): GeoOutcome {
  return { status: "success", result: { lat: position.coords.latitude, lng: position.coords.longitude } };
}

/**
 * Like getCurrentPosition, but distinguishes "permission denied" (the rep needs to go
 * fix a browser/OS setting) from a generic failure (no fix, timeout, no GPS signal —
 * nothing actionable to show them). Error `code` is part of the standard Geolocation
 * API (unlike the newer, less consistently supported Permissions API), so this works
 * the same in Safari, Chrome, etc.
 *
 * Tries a fast GPS-precise fix first, then falls back to slower-but-more-reliable
 * network/Wi-Fi-based positioning if that fails — GPS alone is notoriously unreliable
 * indoors (concrete/metal blocks satellite visibility), and reps are usually inside a
 * store when they take a photo, so relying on GPS alone would fail most of the time.
 */
export function getCurrentPositionDetailed(): Promise<GeoOutcome> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toOutcome(position)),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ status: "denied" });
          return;
        }
        // GPS likely failed indoors — fall back to network-based positioning.
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(toOutcome(position)),
          (fallbackError) => {
            resolve(fallbackError.code === fallbackError.PERMISSION_DENIED ? { status: "denied" } : { status: "unavailable" });
          },
          { enableHighAccuracy: false, timeout: LOW_ACCURACY_TIMEOUT_MS, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: HIGH_ACCURACY_TIMEOUT_MS, maximumAge: 60000 },
    );
  });
}

export async function getCurrentPosition(): Promise<GeoResult | null> {
  const outcome = await getCurrentPositionDetailed();
  return outcome.status === "success" ? outcome.result : null;
}

export interface LocationHelp {
  title: string;
  steps: string[];
}

/** Short, platform-tailored steps for re-enabling location after it's been blocked. */
export function getLocationHelp(): LocationHelp {
  if (typeof navigator === "undefined") {
    return { title: "Enable location access", steps: [] };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isChrome = /CriOS|Chrome/.test(ua);

  if (isIOS && isChrome) {
    return {
      title: "Enable location for Chrome",
      steps: [
        "Open Settings → Privacy & Security → Location Services, and make sure it's on.",
        "Scroll down, tap Chrome, and choose “While Using the App”.",
        "Back in Chrome, tap the “AA” icon at the left of the address bar → Website Settings → Location → Allow.",
        "Reload this page.",
      ],
    };
  }

  if (isIOS) {
    return {
      title: "Enable location for Safari",
      steps: [
        "Open Settings → Privacy & Security → Location Services, and make sure it's on.",
        "Scroll down, tap Safari Websites, and choose “While Using the App” (or “Ask”).",
        "Reload this page and tap Allow when Safari asks.",
      ],
    };
  }

  return {
    title: "Enable location access",
    steps: [
      "Tap the lock or info icon next to the address bar.",
      "Tap Permissions (or Site settings) → Location → Allow.",
      "Reload this page.",
    ],
  };
}
