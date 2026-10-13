"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface PhotoPin {
  id: string;
  lat: number;
  lng: number;
  filename: string;
  capturedAt: string;
  driveFileUrl: string | null;
  brandId: string;
  brandName: string;
  repName: string;
}

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_ZOOM = 6;

// Google's stock colored pin icons — cycled across selected brands so each
// gets a distinct color. Re-used (not unique) once there are more brands
// than colors.
const PIN_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "ltblue"];
const DOT_HEX: Record<string, string> = {
  red: "#ea4335",
  blue: "#4285f4",
  green: "#34a853",
  yellow: "#fbbc04",
  purple: "#a142f4",
  orange: "#ff6d01",
  pink: "#f538a0",
  ltblue: "#00bcd4",
};

// setOptions() must only be called once per page load (the loader warns and
// ignores later calls otherwise) — React 19 Strict Mode double-invokes this
// effect in dev, so guard it at module scope rather than per-instance state.
let optionsSet = false;

export function PhotoMap({ pins, brands }: { pins: PhotoPin[]; brands: { id: string; name: string }[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const brandColor = useMemo(() => {
    const map = new Map<string, string>();
    brands.forEach((b, i) => map.set(b.id, PIN_COLORS[i % PIN_COLORS.length]));
    return map;
  }, [brands]);

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
        mapRef.current = new Map(mapDivRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
        infoWindowRef.current = new google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => setError("Couldn't load Google Maps. Check the API key configuration."));

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visible = pins.filter((p) => selectedBrandIds.includes(p.brandId));
    if (visible.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const pin of visible) {
      const position = { lat: pin.lat, lng: pin.lng };
      bounds.extend(position);
      const color = brandColor.get(pin.brandId) ?? "red";
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: `${pin.brandName} — ${pin.filename}`,
        icon: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
      });
      marker.addListener("click", () => {
        if (!infoWindowRef.current || !mapRef.current) return;
        const capturedDate = new Date(pin.capturedAt).toLocaleString();
        const viewLink = pin.driveFileUrl
          ? `<a href="${pin.driveFileUrl}" target="_blank" rel="noreferrer">View photo</a>`
          : "No file";
        infoWindowRef.current.setContent(
          `<div style="font-size:13px;line-height:1.4">` +
            `<strong>${pin.brandName}</strong><br/>` +
            `${pin.filename}<br/>` +
            `${pin.repName} &middot; ${capturedDate}<br/>` +
            `${viewLink}` +
            `</div>`,
        );
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
      });
      markersRef.current.push(marker);
    }
    mapRef.current.fitBounds(bounds);
  }, [ready, pins, selectedBrandIds, brandColor]);

  const toggleBrand = (id: string) => {
    setSelectedBrandIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Map isn&apos;t configured yet. Ask an admin to set up a Google Maps API key.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedBrandIds(brands.map((b) => b.id))}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => setSelectedBrandIds([])}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {brands.map((b) => {
          const color = brandColor.get(b.id) ?? "red";
          const count = pins.filter((p) => p.brandId === b.id).length;
          return (
            <label key={b.id} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={selectedBrandIds.includes(b.id)} onChange={() => toggleBrand(b.id)} />
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: DOT_HEX[color] }} />
              {b.name} ({count})
            </label>
          );
        })}
        {brands.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No brands yet.</p>}
      </div>
      {selectedBrandIds.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select one or more brands above to see their photo locations.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
