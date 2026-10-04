"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { consumeTourStage, isDemoMode, markTourDone } from "@/lib/demoTour";

// Module-level, checked/set at timer-fire time rather than effect-setup time
// — see DemoCaptureTour's matching comment for why that ordering matters
// under React 19's dev-mode double-invoke of effects.
let attempted = false;

// Stage 2 of the demo's guided tour: the admin dashboard. Only runs if
// DemoCaptureTour handed off via setTourStage("admin") — never fires from a
// direct visit to /admin.
export function DemoAdminTour() {
  useEffect(() => {
    if (!isDemoMode()) return;

    const timer = window.setTimeout(() => {
      if (attempted || !consumeTourStage("admin")) return;
      attempted = true;

      const tour = driver({
        showProgress: true,
        allowClose: true,
        onDestroyed: () => markTourDone(),
        steps: [
          {
            element: "#tour-stat-cards",
            popover: {
              title: "Live numbers",
              description: "Every photo your reps save lands here in real time — today, this week, all-time.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-chart",
            popover: {
              title: "Upload trend",
              description: "A 14-day view of upload volume, so a quiet day stands out immediately.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-nav",
            popover: {
              title: "Dig deeper",
              description: "Photos, Attendance, Reps, and Tags each have their own filterable log and CSV export.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-drive-link",
            popover: {
              title: "See the real files",
              description:
                "Every photo gets organized into Google Drive automatically, by brand. Click here any time to browse the actual folder — that's the end of the tour!",
              side: "bottom",
              align: "end",
              doneBtnText: "Done",
            },
          },
        ],
      });

      tour.drive();
    }, 400);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
