import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { todayString } from "./dates";

const DATA_DIR = join(process.env["HOME"] ?? "~", ".remind-cli");
const LAST_CHECK_PATH = join(DATA_DIR, "last_check");

// Returns true if last_check file contains today's date
export async function hasCheckedToday(): Promise<boolean> {
  if (!existsSync(LAST_CHECK_PATH)) return false;
  const contents = await readFile(LAST_CHECK_PATH, "utf8");
  return contents.trim() === todayString();
}

// Write today's date (YYYY-MM-DD) to last_check file
export async function writeLastCheck(): Promise<void> {
  await writeFile(LAST_CHECK_PATH, todayString(), "utf8");
}
