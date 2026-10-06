import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB request body cap, too small for a real
      // outlet CSV (a national directory can run to thousands of rows). Stay
      // under Vercel's own ~4.5MB serverless request body ceiling (see the
      // same constraint noted in src/lib/imageCompression.ts).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
