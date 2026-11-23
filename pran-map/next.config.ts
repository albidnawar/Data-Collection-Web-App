import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a subfolder of the main repo, which has its own
  // package-lock.json — without this, Turbopack infers the repo root from
  // that outer lockfile instead of this folder.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
