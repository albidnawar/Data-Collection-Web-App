"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { hasTourRun, isDemoMode, markTourDone, setTourStage } from "@/lib/demoTour";

// Module-level (not a ref/state) so React 19's dev-mode double-invoke of
// effects — mount, cleanup, mount again — can't cancel the one real timer
// before it fires: the first pass claims the attempt, the cleanup's
// clearTimeout only ever cancels its own now-irrelevant timer, and the
// second pass's timer is the one left standing.
let attempted = false;

// Stage 1 of the demo's guided tour: the capture screen. Stage 2
// (DemoAdminTour) picks up automatically once this hands off via
// setTourStage("admin") and navigates to /admin.
export function DemoCaptureTour() {
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode() || hasTourRun()) return;

    const advancingToAdmin = { current: false };

    const timer = window.setTimeout(() => {
      // Checked at fire time, not schedule time — see the `attempted` comment
      // above for why that distinction matters.
      if (attempted) return;
      attempted = true;

      const tour = driver({
        showProgress: true,
        allowClose: true,
        onDestroyed: () => {
          if (!advancingToAdmin.current) markTourDone();
        },
        steps: [
          {
            element: "#tour-take-photo",
            popover: {
              title: "Take a photo",
              description: "Reps start here: snap a photo of the shelf, display, or SKU they're logging.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-brand",
            popover: {
              title: "Tag the brand",
              description:
                "Pick an existing brand or add a new one on the fly. Long-press any chip to delete it later (only works if nothing's tagged with it yet).",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-execution",
            popover: {
              title: "Rate the execution",
              description: "Good or bad — this feeds the admin dashboard's execution-quality breakdown.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-kind",
            popover: {
              title: "What kind of photo is this?",
              description: "POSM, a category shelf display, or an individual SKU placement.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-shop-type",
            popover: {
              title: "Tag the shop type",
              description: "Supermarket, pharmacy, kiosk — whatever outlet this is.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-save",
            popover: {
              title: "Save & sync",
              description:
                "Saving queues the photo for upload — it works offline too, and syncs automatically once you're back online. Let's see where it ends up.",
              side: "top",
              align: "start",
              nextBtnText: "Go to admin dashboard",
              onNextClick: () => {
                advancingToAdmin.current = true;
                setTourStage("admin");
                tour.destroy();
                router.push("/admin");
              },
            },
          },
        ],
      });

      tour.drive();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
