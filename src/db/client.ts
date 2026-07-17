import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// node:sqlite (Node) is experimental and prints an ExperimentalWarning to stderr
// the moment it loads. `remind check` runs from a shell-startup hook, so that
// warning would fire on every new shell — suppress this one warning (and only
// this one) before the module is required.
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === "string" ? warning : warning?.message ?? "";
  if (message.includes("SQLite is an experimental feature")) return;
  return (originalEmitWarning as (...a: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

// Minimal driver surface shared by bun:sqlite and node:sqlite.
interface Statement<Params extends unknown[], Row> {
  all(...params: Params): Row[];
  get(...params: Params): Row | undefined;
  run(...params: unknown[]): unknown;
}
export interface DB {
  prepare<Params extends unknown[] = unknown[], Row = unknown>(sql: string): Statement<Params, Row>;
  exec(sql: string): void;
}

const DATA_DIR = join(process.env["HOME"] ?? "~", ".remind-cli");
const DB_PATH = join(DATA_DIR, "reminders.db");

// ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

const require = createRequire(import.meta.url);
const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

// Pick the driver for the runtime: Bun ships bun:sqlite; Node (>= 22.13) ships
// node:sqlite. Neither is a native module, so there is no ABI to mismatch —
// `remind` no longer breaks when a version manager switches the active Node.
function openDatabase(): DB {
  if (isBun) {
    const { Database } = require("bun:sqlite");
    return new Database(DB_PATH) as DB;
  }
  try {
    const { DatabaseSync } = require("node:sqlite");
    return new DatabaseSync(DB_PATH) as DB;
  } catch {
    throw new Error(
      `remind requires Node >= 22.13 (for built-in SQLite) or Bun. Current runtime: Node ${process.versions.node}. Please upgrade Node.`,
    );
  }
}

export const db = openDatabase();

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
