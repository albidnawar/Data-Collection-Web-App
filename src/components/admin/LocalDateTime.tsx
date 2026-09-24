"use client";

import { useEffect, useState } from "react";

export function LocalDateTime({ iso }: { iso: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    // Client's timezone is unknown during SSR/first render, so the locale-formatted
    // string can only be computed here, after hydration, from the browser's Intl data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormatted(new Date(iso).toLocaleString());
  }, [iso]);

  return <>{formatted ?? "—"}</>;
}
