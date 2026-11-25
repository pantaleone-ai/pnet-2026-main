import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for the Pantaleone Chat SaaS database (D1 + SQLite).
 *
 *   npm run db:generate   # compile drizzle/schema.ts -> drizzle/migrations/*.sql
 *   npm run db:apply:dev  # apply to pantaleone-chat-dev (remote)
 *
 * Migrations are reviewable SQL. Never edit an applied migration —
 * always add a new one.
 */
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
});
