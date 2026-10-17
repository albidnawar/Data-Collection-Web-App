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
  const brandPickerRef = useRef<HTMLDivElement>(null);

  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  // Close the brand search dropdown on an outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brandPickerRef.current && !brandPickerRef.current.contains(e.target as Node)) {
        setBrandMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dateFilteredPins = useMemo(() => {
    if (!dateFrom && !dateTo) return pins;
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;
    return pins.filter((p) => {
      const t = new Date(p.capturedAt).getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      return true;
    });
  }, [pins, dateFrom, dateTo]);

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of dateFilteredPins) counts.set(p.brandId, (counts.get(p.brandId) ?? 0) + 1);
    return counts;
  }, [dateFilteredPins]);

  const filteredBrandOptions = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, brandQuery]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visible = dateFilteredPins.filter((p) => selectedBrandIds.includes(p.brandId));
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
  }, [ready, dateFilteredPins, selectedBrandIds, brandColor]);

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
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Clear dates
          </button>
        )}
        <button
          type="button"
          onClick={() => setSelectedBrandIds(brands.map((b) => b.id))}
          className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
        >
          Select all brands
        </button>
        <button
          type="button"
          onClick={() => setSelectedBrandIds([])}
          className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
        >
          Clear brands
        </button>
      </div>

      <div ref={brandPickerRef} className="flex flex-col gap-2">
        {selectedBrandIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedBrandIds.map((id) => {
              const b = brands.find((x) => x.id === id);
              if (!b) return null;
              const color = brandColor.get(id) ?? "red";
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-200"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DOT_HEX[color] }} />
                  {b.name}
                  <button
                    type="button"
                    onClick={() => toggleBrand(id)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-100"
                    aria-label={`Remove ${b.name}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <div className="relative w-72">
          <input
            type="text"
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            onFocus={() => setBrandMenuOpen(true)}
            placeholder="Search and select brands..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          {brandMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {filteredBrandOptions.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching brands.</p>
              )}
              {filteredBrandOptions.map((b) => {
                const color = brandColor.get(b.id) ?? "red";
                const selected = selectedBrandIds.includes(b.id);
                const count = brandCounts.get(b.id) ?? 0;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleBrand(b.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selected ? "bg-gray-50 dark:bg-gray-900" : ""
                    }`}
                  >
                    <input type="checkbox" checked={selected} readOnly className="pointer-events-none" />
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DOT_HEX[color] }} />
                    <span className="flex-1 text-gray-700 dark:text-gray-200">{b.name}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedBrandIds.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Search and select one or more brands above to see their photo locations.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
