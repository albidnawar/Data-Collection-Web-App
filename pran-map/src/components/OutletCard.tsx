"use client";

import { useMemo, useState } from "react";
import type { PranMapOutlet } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";

export function OutletCard({ outlet, onClose }: { outlet: PranMapOutlet; onClose: () => void }) {
  const [view, setView] = useState<"pran" | "competitor">("pran");
  const [zoomedPhotoId, setZoomedPhotoId] = useState<string | null>(null);

  const items = useMemo(
    () => outlet.items.filter((item) => item.pranRelation === view).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [outlet.items, view],
  );

  const pranCount = outlet.items.filter((i) => i.pranRelation === "pran").length;
  const competitorCount = outlet.items.filter((i) => i.pranRelation === "competitor").length;

  return (
    <aside
      className="outlet-card"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--panel-border)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        zIndex: 10,
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--panel-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>{outlet.outletName}</h2>
            {outlet.address && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{outlet.address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {outlet.brandNames.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {outlet.brandNames.map((b) => (
              <span
                key={b}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#1c2735",
                  color: "var(--muted)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>
          Last visit {new Date(outlet.lastVisitAt).toLocaleDateString()}
        </p>
      </div>

      <div style={{ display: "flex", padding: "10px 16px 0", gap: 8 }}>
        <ToggleButton active={view === "pran"} label={`Pran (${pranCount})`} onClick={() => setView("pran")} />
        <ToggleButton
          active={view === "competitor"}
          label={`Competitor (${competitorCount})`}
          onClick={() => setView("competitor")}
        />
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            No {view === "pran" ? "Pran" : "competitor"} photos captured at this outlet.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.photoId}
            className="outlet-item"
            style={{
              border: "1px solid var(--panel-border)",
              borderRadius: 10,
              padding: 10,
            }}
          >
            {item.hasImage ? (
              <button
                onClick={() => setZoomedPhotoId(item.photoId)}
                aria-label="View larger photo"
                style={{ padding: 0, border: "none", background: "none", flexShrink: 0, cursor: "zoom-in" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photo/${item.photoId}`}
                  alt=""
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, display: "block" }}
                />
              </button>
            ) : (
              <div
                className="no-image"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  background: "#1c2735",
                  flexShrink: 0,
                  color: "var(--muted)",
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                No image
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{KIND_LABEL[item.kind]}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: item.isGoodExecution ? "var(--good)" : "var(--bad)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.isGoodExecution ? "Good" : "Bad"}
                </span>
              </div>
              {view === "competitor" && item.brandName && (
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "2px 0" }}>
                  {item.brandName}
                </p>
              )}
              <p style={{ fontSize: 13, margin: "2px 0" }}>{item.typeName ?? "—"}</p>
              {item.productCategoryName && (
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0" }}>{item.productCategoryName}</p>
              )}
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0" }}>
                {new Date(item.capturedAt).toLocaleString()}
              </p>
              {(item.surroundingRemarks || item.otherRemarks) && (
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>
                  {[item.surroundingRemarks, item.otherRemarks].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {zoomedPhotoId && (
        <div
          onClick={() => setZoomedPhotoId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photo/${zoomedPhotoId}?full=1`}
            alt=""
            style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8 }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomedPhotoId(null);
            }}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </aside>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--panel-border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "white" : "var(--muted)",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}
