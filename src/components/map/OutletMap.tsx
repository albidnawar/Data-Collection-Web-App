"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface OutletPin {
  id: string;
  code: string;
  lat: number;
  lng: number;
  brandId: string;
  brandName: string;
}

// Default view before any outlets have loaded / when there are none at all.
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_ZOOM = 6;

export function OutletMap({ outlets, brands }: { outlets: OutletPin[]; brands: { id: string; name: string }[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapDivRef.current) return;
    let cancelled = false;

    setOptions({ key: apiKey, v: "weekly" });
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

    const visible = brandFilter ? outlets.filter((o) => o.brandId === brandFilter) : outlets;
    if (visible.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const outlet of visible) {
      const position = { lat: outlet.lat, lng: outlet.lng };
      bounds.extend(position);
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: `${outlet.code} — ${outlet.brandName}`,
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
  }, [ready, outlets, brandFilter]);

  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Map isn&apos;t configured yet. Ask an admin to set up a Google Maps API key.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <select
        value={brandFilter}
        onChange={(e) => setBrandFilter(e.target.value)}
        className="self-start rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
