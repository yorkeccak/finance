import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let db: BetterSQLite3Database<typeof schema> | null = null;

// Development user ID - consistent across sessions
export const DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000000";
export const DEV_USER_EMAIL = "dev@localhost";

export function getLocalDb() {
  if (db) return db;

  // Create .local-data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), ".local-data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "dev.db");
  const sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  db = drizzle(sqlite, { schema });

  // Initialize database with tables
  initializeDatabase(sqlite);

  return db;
}

function initializeDatabase(sqlite: Database.Database) {
  // Create tables if they don't exist
  // Note: All users must authenticate with Valyu OAuth. No rate limiting - credits handled by Valyu Platform.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Insert dev user if it doesn't exist
  const existingUser = sqlite
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(DEV_USER_ID);

  if (!existingUser) {
    sqlite
      .prepare(
        `INSERT INTO users (id, email)
         VALUES (?, ?)`
      )
      .run(DEV_USER_ID, DEV_USER_EMAIL);
  }
}

// Close database connection (for cleanup)
export function closeLocalDb() {
  if (db) {
    // @ts-ignore - accessing internal sqlite instance
    db.$client?.close();
    db = null;
  }
}
