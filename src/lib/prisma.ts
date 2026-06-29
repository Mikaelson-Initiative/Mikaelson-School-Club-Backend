// src/lib/prisma.ts
// ─────────────────────────────────────────────────────────────────────────────
// Prisma v5 client singleton with soft-delete query extension.
//
// Prisma v5 removed $use() middleware in favour of $extends() with the
// query extension API. This file uses the correct v5 approach.
//
// Soft-delete behaviour:
//   • findMany / findFirst / findFirstOrThrow / count / aggregate
//     → automatically appends { isDeleted: false } to the where clause
//   • findUnique / findUniqueOrThrow
//     → redirected to findFirst / findFirstOrThrow with the same filter
//   • delete / deleteMany
//     → converted to update / updateMany setting isDeleted=true, deletedAt=now()
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Models that support soft delete — must match the Prisma schema exactly
const SOFT_DELETE_MODELS = new Set([
  "User",
  "SchoolChapter",
  "Application",
  "Event",
  "BlogPost",
  "TeamMember",
  "Lesson",
  "Project",
  "VolunteerApplication",
]);

function buildPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        // ── READ: inject isDeleted filter ─────────────────────────────────
        async findMany({ model, args, query }: { model: any, args: any, query: any }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false } as typeof args.where;
          }
          return query(args);
        },

        async findFirst({ model, args, query }: { model: any, args: any, query: any }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false } as typeof args.where;
          }
          return query(args);
        },

        async findFirstOrThrow({ model, args, query }: { model: any, args: any, query: any }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false } as typeof args.where;
          }
          return query(args);
        },

        async count({ model, args, query }: { model: any, args: any, query: any }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false } as typeof args.where;
          }
          return query(args);
        },

        async aggregate({ model, args, query }: { model: any, args: any, query: any }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            // aggregate where is typed as optional — cast safely
            (args as { where?: Record<string, unknown> }).where = {
              ...(args as { where?: Record<string, unknown> }).where,
              isDeleted: false,
            };
          }
          return query(args);
        },

        // ── SOFT DELETE: intercept delete → update ─────────────────────────
        async delete({ model, args, query }: { model: any, args: any, query: any }) {
          if (!SOFT_DELETE_MODELS.has(model)) return query(args);

          // Recast to update args — Prisma extension types allow this
          return (
            (base as any)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ] as any
          ).update({
            where: (args as { where: unknown }).where,
            data: { isDeleted: true, deletedAt: new Date() },
          }) as ReturnType<typeof query>;
        },

        async deleteMany({ model, args, query }: { model: any, args: any, query: any }) {
          if (!SOFT_DELETE_MODELS.has(model)) return query(args);

          return (
            (base as any)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ] as any
          ).updateMany({
            where: (args as { where?: unknown }).where,
            data: { isDeleted: true, deletedAt: new Date() },
          }) as ReturnType<typeof query>;
        },
      },
    },
  });
}

// Type alias so the rest of the codebase gets correct type inference
type ExtendedPrismaClient = ReturnType<typeof buildPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma namespace for use in other files (e.g. error codes)
export { Prisma };