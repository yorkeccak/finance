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

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_message_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      processing_time_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS charts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      chart_data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS csvs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      headers TEXT NOT NULL,
      rows TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_charts_session_id ON charts(session_id);
    CREATE INDEX IF NOT EXISTS idx_csvs_session_id ON csvs(session_id);
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
