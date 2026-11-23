"use client";

import { useEffect, useRef, useState } from "react";
import type * as MapLibreGL from "maplibre-gl";
import type { PranMapOutlet } from "@/lib/types";
import { OutletCard } from "./OutletCard";

// Loaded at runtime as a native ES module straight from the CDN, not through
// the npm package: maplibre-gl v6 dropped the old global/UMD browser bundle
// and ships only as ESM, with its web worker as a separate sibling module
// file resolved via a relative `import.meta.url`. When Next.js/Turbopack
// bundles that import, the relative worker URL resolution breaks ("Worker
// failed to load"), which leaves markers working but the map tiles
// themselves blank. Loading the untouched .mjs file directly as a real
// `<script type="module">` (no bundler in between) resolves the worker
// correctly, because the browser's own import.meta.url then points at the
// CDN. The npm package stays a devDependency purely for these types.
declare global {
  interface Window {
    maplibregl: typeof MapLibreGL;
  }
}

const MAPTILER_KEY = "8wS98OmyLACgCknWGgZT";
const MAPLIBRE_VERSION = "6.19.0";
const MAPLIBRE_CDN_BASE = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist`;

// Marker color reflects Pran's own Category Shelf Display execution only
// (not POSM/SKU) — red if any such shelf at this outlet is bad, green if
// every one of them is good, gray if Pran has no category shelf photo here.
function markerColor(outlet: PranMapOutlet): string {
  const pranCategoryItems = outlet.items.filter((i) => i.pranRelation === "pran" && i.kind === "category");
  if (pranCategoryItems.length === 0) return "#8b98a5";
  return pranCategoryItems.some((i) => !i.isGoodExecution) ? "#ef4444" : "#22c55e";
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const markersRef = useRef<MapLibreGL.Marker[]>([]);
  const [libReady, setLibReady] = useState(false);
  const [outlets, setOutlets] = useState<PranMapOutlet[]>([]);
  const [selected, setSelected] = useState<PranMapOutlet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.maplibregl) {
      setLibReady(true);
      return;
    }
    const handleReady = () => setLibReady(true);
    window.addEventListener("maplibregl-ready", handleReady, { once: true });

    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import * as maplibregl from "${MAPLIBRE_CDN_BASE}/maplibre-gl.mjs";
      window.maplibregl = maplibregl;
      window.dispatchEvent(new Event("maplibregl-ready"));
    `;
    document.head.appendChild(script);

    return () => window.removeEventListener("maplibregl-ready", handleReady);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/outlets");
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Failed to load outlets (${res.status}).`);
        }
        const data = await res.json();
        if (!cancelled) setOutlets(data.outlets ?? []);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load outlets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!libReady || !containerRef.current || mapRef.current) return;
    const maplibregl = window.maplibregl;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [90.4125, 23.8103],
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [libReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !libReady) return;
    const maplibregl = window.maplibregl;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const outlet of outlets) {
      // A larger invisible wrapper gives a real touch target on phones
      // (the visible dot alone is too small to reliably tap) without
      // changing how big the pin looks.
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";

      const dot = document.createElement("div");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "50%";
      dot.style.border = "2px solid white";
      dot.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
      dot.style.background = markerColor(outlet);
      el.appendChild(dot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([outlet.lng, outlet.lat])
        .addTo(map);

      el.addEventListener("click", () => setSelected(outlet));
      markersRef.current.push(marker);
    }

    if (outlets.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const outlet of outlets) bounds.extend([outlet.lng, outlet.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    }
  }, [outlets, libReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <link rel="stylesheet" href={`${MAPLIBRE_CDN_BASE}/maplibre-gl.css`} />

      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div
        className="map-legend"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          background: "var(--panel)",
          border: "1px solid var(--panel-border)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          zIndex: 5,
          maxWidth: 260,
        }}
      >
        <strong>Pran Execution Map</strong>
        <div style={{ color: "var(--muted)", marginTop: 4 }}>
          {loading ? "Loading outlets…" : `${outlets.length} outlet${outlets.length === 1 ? "" : "s"}`}
        </div>
        {loadError && <div style={{ color: "var(--bad)", marginTop: 4 }}>{loadError}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
          <Legend color="#22c55e" label="Pran shelf: Good" />
          <Legend color="#ef4444" label="Pran shelf: Bad" />
          <Legend color="#8b98a5" label="No Pran shelf data" />
        </div>
      </div>

      {selected && <OutletCard outlet={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
