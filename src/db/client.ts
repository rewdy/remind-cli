import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DATA_DIR = join(process.env["HOME"] ?? "~", ".remind-cli");
const DB_PATH = join(DATA_DIR, "reminders.db");

// ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);

// run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id          TEXT PRIMARY KEY,
    title       TEXT,
    body        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('once', 'recurring')),
    schedule    TEXT NOT NULL,
    next_show   TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    done        INTEGER NOT NULL DEFAULT 0
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reminders_next_show
  ON reminders(next_show) WHERE done = 0
`);
