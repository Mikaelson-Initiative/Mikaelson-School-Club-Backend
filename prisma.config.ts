import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // This safely reads DATABASE_URL from your .env file
    url: process.env.DATABASE_URL ?? "", 
  },
});
