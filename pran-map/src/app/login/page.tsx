"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--panel)",
          border: "1px solid var(--panel-border)",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Pran Execution Map</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            Enter the password to view outlet execution data.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--panel-border)",
            background: "#0f1520",
            color: "var(--text)",
            fontSize: 14,
          }}
        />
        {error && <p style={{ color: "var(--bad)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "white",
            fontWeight: 600,
            fontSize: 14,
            opacity: submitting || password.length === 0 ? 0.6 : 1,
          }}
        >
          {submitting ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
