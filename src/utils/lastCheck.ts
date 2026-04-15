import { join } from "node:path";
import { existsSync } from "node:fs";
import { todayString } from "./dates";

const DATA_DIR = join(process.env["HOME"] ?? "~", ".remind-cli");
const LAST_CHECK_PATH = join(DATA_DIR, "last_check");

// Returns true if last_check file contains today's date
export async function hasCheckedToday(): Promise<boolean> {
  if (!existsSync(LAST_CHECK_PATH)) return false;
  const contents = await Bun.file(LAST_CHECK_PATH).text();
  return contents.trim() === todayString();
}

// Write today's date (YYYY-MM-DD) to last_check file
export async function writeLastCheck(): Promise<void> {
  await Bun.write(LAST_CHECK_PATH, todayString());
}
