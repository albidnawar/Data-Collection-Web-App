// Which camera UI the capture/selfie buttons use. Some Android phones (seen
// on a Redmi Note 9 Pro) can't run Chrome's own built-in capture-and-preview
// UI ("browser") without hitting a "low memory" failure, but that UI is the
// faster one-tap flow on phones it does work on — so instead of picking one
// behavior for everyone, each rep picks per-device and it's remembered from
// then on, rather than asked every time.
export type CameraMode = "browser" | "device";

const STORAGE_KEY = "camtag:cameraMode";
const DEFAULT_MODE: CameraMode = "browser";

export function getCameraMode(): CameraMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  return window.localStorage.getItem(STORAGE_KEY) === "device" ? "device" : DEFAULT_MODE;
}

// Matches the existing "fieldlenz:queue-changed" convention (see
// usePendingQueue.ts) for telling other already-mounted components on the
// same page that this device-wide preference just changed — a plain
// localStorage write alone only reaches other tabs/pages via the "storage"
// event, never the tab that made the change.
const CHANGE_EVENT = "fieldlenz:camera-mode-changed";

export function setCameraMode(mode: CameraMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onCameraModeChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}
