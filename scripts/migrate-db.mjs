import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sqlitePath = resolve(process.env.SQLITE_PATH ?? resolve(projectRoot, "data/slimming-assistant.sqlite"));

mkdirSync(dirname(sqlitePath), { recursive: true });

const sqlite = new Database(sqlitePath);
sqlite.pragma("foreign_keys = ON");

try {
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: resolve(projectRoot, "db/migrations") });
} finally {
  sqlite.close();
}
