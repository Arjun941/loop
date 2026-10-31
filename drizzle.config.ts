import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  // Supabase owns the auth schema; we only manage public.
  schemaFilter: ["public"],
});
