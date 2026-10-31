/**
 * Database connection: Supabase Postgres through its **session** pooler (port 5432).
 *
 * Not the transaction pooler (port 6543): when a page runs more queries at once than there are
 * connections, the driver pipelines several queries on one connection, and the transaction pooler
 * stalls on that until the statement timeout. The session pooler handles it fine.
 * `prepare: false` keeps it compatible with either. One client per process, reused across hot reloads.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Supabase connection string.");
  if (/pooler\.supabase\.com:6543\//.test(url)) {
    console.warn("[db] DATABASE_URL uses the transaction pooler (6543). Use the session pooler (5432): pages that run many queries at once can stall on 6543.");
  }
  const client = postgres(url, { prepare: false, max: 10 });
  return drizzle({ client, schema });
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
