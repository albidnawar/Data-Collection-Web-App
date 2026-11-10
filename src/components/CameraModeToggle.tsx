"use client";

import { useEffect, useState } from "react";
import { getCameraMode, setCameraMode, type CameraMode } from "@/lib/cameraMode";

export function CameraModeToggle() {
  // Starts at the same default the helper returns before mount (localStorage
  // isn't available during server rendering), then syncs to whatever this
  // device actually has saved right after mount — matching the pattern used
  // elsewhere in the app for client-only state, so there's no hydration
  // mismatch to warn about.
  const [mode, setMode] = useState<CameraMode>("browser");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(getCameraMode());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as CameraMode;
    setCameraMode(next);
    setMode(next);
  };

  return (
    <label className="flex items-center gap-1 text-sm font-medium whitespace-nowrap text-gray-600 dark:text-gray-400">
      Camera
      <select
        value={mode}
        onChange={handleChange}
        className="rounded border border-gray-300 bg-transparent px-1 py-0.5 text-sm dark:border-gray-700"
      >
        <option value="browser">Chrome camera</option>
        <option value="device">Phone&apos;s camera app</option>
      </select>
    </label>
  );
}
