/**
 * Applies pending migrations from ./drizzle to the database in DATABASE_URL.
 *   npm run db:migrate
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

async function main() {
  const { db, closeDb } = await import("./index");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Migrations applied.");
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
