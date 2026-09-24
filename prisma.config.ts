import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Neon's pooled connection string in production (see .env.example).
    url: env("DATABASE_URL"),
    // Neon's direct (unpooled) connection string — used for shadow DB during migrations.
    shadowDatabaseUrl: env("DIRECT_DATABASE_URL"),
  },
});
