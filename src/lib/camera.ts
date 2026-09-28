/**
 * Eagerly triggers the browser's camera permission prompt (if not already
 * decided) by briefly opening and immediately closing a camera stream. The
 * actual photo/selfie capture still goes through the native file input's
 * capture attribute — this just gets the permission dialog in front of the
 * rep right away instead of only when they first tap the capture button.
 */
export async function requestCameraPermission(facingMode: "user" | "environment"): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // Denied, no camera, or unsupported — the file input's native capture
    // flow still works on its own and will prompt again there if needed.
  }
}
