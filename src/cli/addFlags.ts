import { randomUUID } from "crypto";
import { parseISO, isValid } from "date-fns";
import { createReminder } from "../db/reminders";
import { computeNextShow, todayString } from "../utils/dates";
import type { Interval } from "../utils/dates";

const VALID_INTERVALS: Interval[] = [
  "daily",
  "weekly",
  "monthly",
  "every 2 months",
  "every 3 months",
  "every 6 months",
  "every year",
];

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg && arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        result[key] = next;
        i += 2;
      } else {
        result[key] = "";
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return result;
}

export function runAddFlags(args: string[]): void {
  const flags = parseArgs(args);

  const body = flags["body"];
  const title = flags["title"] ?? undefined;
  const once = flags["once"];
  const recurring = flags["recurring"];

  if (!body) {
    process.stderr.write("Error: --body is required\n");
    process.exit(1);
  }

  if (!once && !recurring) {
    process.stderr.write("Error: specify either --once <date> or --recurring <interval>\n");
    process.exit(1);
  }

  if (once && recurring) {
    process.stderr.write("Error: --once and --recurring are mutually exclusive\n");
    process.exit(1);
  }

  if (once) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(once) || !isValid(parseISO(once))) {
      process.stderr.write(`Error: invalid date "${once}" — use YYYY-MM-DD format\n`);
      process.exit(1);
    }
    if (once < todayString()) {
      process.stderr.write(`Error: invalid date "${once}" — use YYYY-MM-DD format\n`);
      process.exit(1);
    }
  }

  if (recurring && !(VALID_INTERVALS as string[]).includes(recurring)) {
    process.stderr.write(
      `Error: invalid interval "${recurring}"\nValid intervals: ${VALID_INTERVALS.join(", ")}\n`,
    );
    process.exit(1);
  }

  const id = randomUUID();
  const schedule = once ? once : (recurring as Interval);
  const next_show = once ? once : computeNextShow(recurring as Interval);

  createReminder({
    id,
    title,
    body,
    type: once ? "once" : "recurring",
    schedule,
    next_show,
    created_at: new Date().toISOString(),
  });

  console.log("Reminder created.");
}
