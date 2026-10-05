"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import { requestCameraPermission } from "@/lib/camera";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { getCurrentPositionDetailed, getLocationHelp } from "@/lib/geolocation";
import { formatRawCoords } from "@/lib/geocoding";
import { LocalDateTime } from "@/components/admin/LocalDateTime";

type Mode = "clockin" | "clockout" | "done";

const COPY: Record<Exclude<Mode, "done">, { title: string; subtitle: string; button: string }> = {
  clockin: {
    title: "Start your day",
    subtitle: "Take a selfie and share your location to begin today's visits.",
    button: "Start Day",
  },
  clockout: {
    title: "End your day",
    subtitle: "Take a selfie and share your location to finish up.",
    button: "End Day",
  },
};

export function AttendanceClient({
  mode,
  clockInAt,
  clockOutAt,
}: {
  mode: Mode;
  clockInAt: string | null;
  clockOutAt: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    setLocatingGps(true);
    const outcome = await getCurrentPositionDetailed();
    setLocatingGps(false);
    setLocationBlocked(outcome.status === "denied");
    setLocationUnavailable(outcome.status === "unavailable");
    if (outcome.status === "success") setGps(outcome.result);
  };

  useEffect(() => {
    if (mode === "done") return;
    // Same rationale as the capture screen: a client-only async browser API
    // result can only be known post-mount, so this state update is unavoidable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestLocation();
    void requestCameraPermission("user");
  }, [mode]);

  const handleTakeSelfie = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawFile = input.files?.[0];
    if (!rawFile) return;
    setError(null);
    setCompressing(true);

    let file: File;
    try {
      file = await compressImageIfNeeded(rawFile);
    } catch (err) {
      setCompressing(false);
      setError(err instanceof Error ? err.message : "This photo couldn't be opened. Please retake it or choose a different one.");
      input.value = "";
      return;
    }
    setCompressing(false);
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Location is best-effort, same as the main capture screen — a GPS hiccup
  // shouldn't lock a rep out of starting or ending their day entirely.
  const canSubmit = mode !== "done" && photo !== null && !locatingGps && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !photo) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("kind", mode);
      formData.set("photo", photo, "selfie.jpg");
      if (gps) {
        formData.set("lat", String(gps.lat));
        formData.set("lng", String(gps.lng));
        formData.set("address", formatRawCoords(gps.lat, gps.lng));
      }

      const res = await fetch("/api/attendance", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (mode === "done") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center dark:bg-gray-950">
        <CheckCircle2 className="size-10 text-green-600" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">You&apos;re all set for today</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Started at <LocalDateTime iso={clockInAt as string} />, ended at <LocalDateTime iso={clockOutAt as string} />
        </p>
        <Link href="/" className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Back to app
        </Link>
      </div>
    );
  }

  const copy = COPY[mode];

  return (
    <div className="flex min-h-dvh flex-col gap-6 bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{copy.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{copy.subtitle}</p>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        {locationBlocked && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Location access is off. Turn it back on to continue.
            </p>
            <p className="font-medium text-amber-800 dark:text-amber-200">{getLocationHelp().title}:</p>
            <ol className="list-decimal space-y-1 pl-5 text-amber-800 dark:text-amber-200">
              {getLocationHelp().steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => void requestLocation()}
              className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              I&apos;ve done this, try again
            </button>
          </div>
        )}

        {compressing ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white">
            <Camera className="size-8" strokeWidth={1.75} />
            <span className="text-lg font-semibold">Processing photo…</span>
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Selfie" className="aspect-square w-full rounded-2xl object-cover" />
        ) : (
          <button
            type="button"
            onClick={handleTakeSelfie}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white active:bg-blue-700"
          >
            <Camera className="size-8" strokeWidth={1.75} />
            <span className="text-lg font-semibold">Take Selfie</span>
          </button>
        )}

        {previewUrl && (
          <button
            type="button"
            onClick={handleTakeSelfie}
            className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Retake selfie
          </button>
        )}

        {locationUnavailable && !locationBlocked && !locatingGps && (
          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t get a location fix (common indoors). Try stepping outside and tap retry above.
          </p>
        )}

        {error && <p className="mt-3 text-center text-sm font-medium text-red-600">{error}</p>}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-4 w-full rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Submitting…" : locatingGps ? "Locating…" : copy.button}
        </button>
      </div>
    </div>
  );
}
