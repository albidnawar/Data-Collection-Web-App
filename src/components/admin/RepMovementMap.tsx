"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface RepMovementPoint {
  id: string;
  repId: string;
  lat: number;
  lng: number;
  capturedAt: string;
  filename: string;
  typeLabel: string;
  driveFileUrl: string | null;
}

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_ZOOM = 6;

const START_COLOR = "#34a853";
const END_COLOR = "#ea4335";
const STOP_COLOR = "#4285f4";

// A round numbered marker for an in-between stop — a solid circle with the
// stop number in white, legible since nothing behind it is pre-colored.
function stopIcon(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 13,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: 2,
    labelOrigin: new google.maps.Point(0, 0),
  };
}

// The first/last stop gets a flag instead of a plain dot, so the route's
// start and end jump out on the map. A white flag face keeps the number
// label (dark text) legible regardless of the flag's border color.
function flagIcon(color: string): google.maps.Icon {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">` +
    `<line x1="10" y1="6" x2="10" y2="38" stroke="#374151" stroke-width="2.5"/>` +
    `<path d="M10 6 L36 15 L10 24 Z" fill="white" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
    `</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(42, 42),
    anchor: new google.maps.Point(10, 38),
    labelOrigin: new google.maps.Point(22, 15),
  };
}

// setOptions() must only be called once per page load (the loader warns and
// ignores later calls otherwise) — React 19 Strict Mode double-invokes this
// effect in dev, so guard it at module scope rather than per-instance state.
let optionsSet = false;

export function RepMovementMap({ points, reps }: { points: RepMovementPoint[]; reps: { id: string; name: string }[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const [repId, setRepId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapDivRef.current) return;
    let cancelled = false;

    if (!optionsSet) {
      setOptions({ key: apiKey, v: "weekly" });
      optionsSet = true;
    }
    importLibrary("maps")
      .then(({ Map }) => {
        if (cancelled || !mapDivRef.current) return;
        // Capped so fitBounds (and manual zooming) never requests a zoom
        // level past what has tile coverage for a given area - without this,
        // zooming in tight on a cluster of nearby points, or on areas outside
        // major cities, could silently snap back to the nearest zoom that
        // actually has tiles, which looks like the map "zooming itself out".
        mapRef.current = new Map(mapDivRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, maxZoom: 19 });
        infoWindowRef.current = new google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => setError("Couldn't load Google Maps. Check the API key configuration."));

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const orderedPoints = useMemo(() => {
    if (!repId) return [];

    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;
    // Time-of-day uses the browser's local clock (matching how captured
    // times are displayed elsewhere in the admin), not the stored UTC
    // instant, so "9am-5pm" means the rep's actual working hours.
    const [fromH, fromM] = timeFrom ? timeFrom.split(":").map(Number) : [null, null];
    const [toH, toM] = timeTo ? timeTo.split(":").map(Number) : [null, null];
    const fromMinutes = fromH !== null ? fromH * 60 + (fromM ?? 0) : null;
    const toMinutes = toH !== null ? toH * 60 + (toM ?? 0) : null;

    return points
      .filter((p) => p.repId === repId)
      .filter((p) => {
        const t = new Date(p.capturedAt).getTime();
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
        return true;
      })
      .filter((p) => {
        if (fromMinutes === null && toMinutes === null) return true;
        const d = new Date(p.capturedAt);
        const minutes = d.getHours() * 60 + d.getMinutes();
        if (fromMinutes !== null && minutes < fromMinutes) return false;
        if (toMinutes !== null && minutes > toMinutes) return false;
        return true;
      })
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  }, [points, repId, dateFrom, dateTo, timeFrom, timeTo]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (orderedPoints.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const path: google.maps.LatLngLiteral[] = [];

    orderedPoints.forEach((point, i) => {
      const position = { lat: point.lat, lng: point.lng };
      bounds.extend(position);
      path.push(position);

      const isStart = i === 0;
      const isEnd = i === orderedPoints.length - 1 && orderedPoints.length > 1;

      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        label: {
          text: String(i + 1),
          color: isStart || isEnd ? "#111827" : "white",
          fontSize: "11px",
          fontWeight: "bold",
        },
        icon: isStart ? flagIcon(START_COLOR) : isEnd ? flagIcon(END_COLOR) : stopIcon(STOP_COLOR),
        title: `#${i + 1} — ${point.typeLabel}`,
      });
      marker.addListener("click", () => {
        if (!infoWindowRef.current || !mapRef.current) return;
        const capturedDate = new Date(point.capturedAt).toLocaleString();
        const viewLink = point.driveFileUrl
          ? `<a href="${point.driveFileUrl}" target="_blank" rel="noreferrer">View photo</a>`
          : "No file";
        const stopLabel = isStart ? "Start" : isEnd ? "End" : `Stop ${i + 1}`;
        infoWindowRef.current.setContent(
          `<div style="font-size:13px;line-height:1.4">` +
            `<strong>#${i + 1} &middot; ${stopLabel}</strong><br/>` +
            `${point.typeLabel}<br/>` +
            `${capturedDate}<br/>` +
            `${viewLink}` +
            `</div>`,
        );
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
      });
      markersRef.current.push(marker);
    });

    if (path.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#4285f4",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapRef.current,
      });
    }

    mapRef.current.fitBounds(bounds);
  }, [ready, orderedPoints]);

  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Map isn&apos;t configured yet. Ask an admin to set up a Google Maps API key.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Rep
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">Select a rep…</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Date from
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Date to
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Time from
          <input
            type="time"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Time to
          <input
            type="time"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        {(dateFrom || dateTo || timeFrom || timeTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setTimeFrom("");
              setTimeTo("");
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {!repId && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a rep above to see their movement.</p>
      )}
      {repId && orderedPoints.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No located product photos for this rep in that date/time range.
        </p>
      )}
      {repId && orderedPoints.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {orderedPoints.length} stop{orderedPoints.length === 1 ? "" : "s"}, in order — green is the start, red is the
          end.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
