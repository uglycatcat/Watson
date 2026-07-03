import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";
import { seedDatabase } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDbPath(): string {
  return process.env.DATABASE_PATH ?? path.join(repoRoot(), "data", "watson.db");
}

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

export function createDb(dbPath = getDbPath()) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = createDb();
  return _db;
}

export function runMigrations(db = getDb()) {
  const migrationsFolder = path.join(__dirname, "../../drizzle");
  migrate(db, { migrationsFolder });
  seedDatabase(db);
}
