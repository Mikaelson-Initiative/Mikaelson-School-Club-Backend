import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Migrations/introspection need the direct (unpooled) connection —
    // the app itself connects via DATABASE_URL (pooled) through the pg adapter at runtime.
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
});
