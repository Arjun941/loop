/**
 * Database connection: Supabase Postgres through its **transaction** pooler (port 6543), with node-postgres.
 *
 * Why this pairing:
 * - The transaction pooler shares a few real database connections among many clients, so any number
 *   of serverless instances can connect. The session pooler (5432) gives each client its own database
 *   connection and caps them all at the plan's pool size (15 on smaller plans): a handful of Vercel
 *   instances exhausted it and every query failed with EMAXCONNSESSION.
 * - node-postgres runs one query per connection and queues the rest until one is free. (postgres-js
 *   pipelines extra queries onto busy connections, which the transaction pooler stalls on.)
 *
 * Advisory locks are transaction-scoped (`pg_advisory_xact_lock`), which the transaction pooler supports.
 * One pool per process, reused across hot reloads. Override the pool size with DB_POOL_MAX.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Supabase connection string.");
  if (/pooler\.supabase\.com:5432\//.test(url)) {
    console.warn("[db] DATABASE_URL uses the session pooler (5432), which caps total connections. Use the transaction pooler (6543).");
  }
  const onVercel = !!process.env.VERCEL;
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: onVercel ? 5_000 : 20_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client can be dropped by the pooler; log it instead of crashing the process.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  return drizzle({ client: pool, schema });
}

type DB = ReturnType<typeof connect>;
const g = globalThis as unknown as { __loopDb?: DB };

/** The Drizzle client. Connects lazily, so importing this module (as the build does) never opens a connection. */
export const db = new Proxy({} as DB, {
  get(_, prop) {
    const target = (g.__loopDb ??= connect());
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

/** Closes the connection; used by scripts so they can exit. */
export async function closeDb() {
  await g.__loopDb?.$client.end();
  g.__loopDb = undefined;
}

export { schema };
