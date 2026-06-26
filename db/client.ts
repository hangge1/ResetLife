import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

export type AppDb = ReturnType<typeof createDrizzleClient>;
type AppConnection = ReturnType<typeof createSqliteConnection>;

const DEFAULT_SQLITE_PATH = "./data/slimming-assistant.sqlite";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function createDrizzleClient(sqlite: Database.Database) {
  return drizzle(sqlite, { schema });
}

function resolveFromProjectRoot(path: string) {
  return resolve(projectRoot, path);
}

export function resolveSqlitePath() {
  const sqlitePath = process.env.SQLITE_PATH ?? DEFAULT_SQLITE_PATH;
  return isAbsolute(sqlitePath) ? sqlitePath : resolve(projectRoot, sqlitePath);
}

export function createSqliteConnection(sqlitePath = resolveSqlitePath()) {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = createDrizzleClient(sqlite);
  migrate(db, { migrationsFolder: resolveFromProjectRoot("db/migrations") });

  return {
    sqlite,
    db,
  };
}

let defaultConnection: AppConnection | null = null;

export function getDefaultConnection() {
  defaultConnection ??= createSqliteConnection();
  return defaultConnection;
}

export function getDb() {
  return getDefaultConnection().db;
}

export function closeDefaultConnectionForTests() {
  defaultConnection?.sqlite.close();
  defaultConnection = null;
}
