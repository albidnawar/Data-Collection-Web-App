"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface OutletPin {
  id: string;
  code: string;
  town: string;
  lat: number;
  lng: number;
  brandId: string;
  brandName: string;
}

// Default view before any outlets have loaded / when there are none at all.
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_ZOOM = 6;

// setOptions() must only be called once per page load (the loader warns and
// ignores later calls otherwise) — React 19 Strict Mode double-invokes this
// effect in dev, so guard it at module scope rather than per-instance state.
let optionsSet = false;

export function OutletMap({ outlets, brands }: { outlets: OutletPin[]; brands: { id: string; name: string }[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);
  const [brandFilter, setBrandFilter] = useState("");
  const [townFilter, setTownFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const towns = useMemo(
    () => Array.from(new Set(outlets.map((o) => o.town))).sort((a, b) => a.localeCompare(b)),
    [outlets],
  );

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

    const visible = outlets.filter(
      (o) => (!brandFilter || o.brandId === brandFilter) && (!townFilter || o.town === townFilter),
    );
    if (visible.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const outlet of visible) {
      const position = { lat: outlet.lat, lng: outlet.lng };
      bounds.extend(position);
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: `${outlet.code} — ${outlet.brandName} (${outlet.town})`,
      });
      marker.addListener("click", () => {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${outlet.lat},${outlet.lng}`,
          "_blank",
          "noopener,noreferrer",
        );
      });
      markersRef.current.push(marker);
    }
    mapRef.current.fitBounds(bounds);
  }, [ready, outlets, brandFilter, townFilter]);

  const goToPoint = (lat: number, lng: number, title: string) => {
    if (!mapRef.current) return;
    searchMarkerRef.current?.setMap(null);
    const position = { lat, lng };
    searchMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position,
      title,
      icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });
    searchMarkerRef.current.addListener("click", () => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
    });
    mapRef.current.panTo(position);
    mapRef.current.setZoom(16);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const query = searchQuery.trim();
    if (!query || !ready) return;

    const latLngMatch = query.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (latLngMatch) {
      const lat = Number(latLngMatch[1]);
      const lng = Number(latLngMatch[2]);
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setSearchError("That doesn't look like a valid lat,lng pair.");
        return;
      }
      goToPoint(lat, lng, `${lat}, ${lng}`);
      return;
    }

    const match =
      outlets.find((o) => o.code.toLowerCase() === query.toLowerCase()) ??
      outlets.find((o) => o.code.toLowerCase().includes(query.toLowerCase()));
    if (!match) {
      setSearchError(`No outlet found for "${query}".`);
      return;
    }
    goToPoint(match.lat, match.lng, `${match.code} — ${match.brandName} (${match.town})`);
  };

  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Map isn&apos;t configured yet. Ask an admin to set up a Google Maps API key.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={townFilter}
          onChange={(e) => setTownFilter(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">All towns</option>
          {towns.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by outlet code or lat,lng"
          className="w-64 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Search
        </button>
      </form>
      {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
