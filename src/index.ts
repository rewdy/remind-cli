#!/usr/bin/env node

import { runCheck } from "./cli/check";
import { runManual } from "./cli/manual";
import { runAdd } from "./cli/add";
import { runList } from "./cli/list";
import { runInit } from "./cli/init";

const [, , subcommand, ...args] = process.argv;

const USAGE = `
remind — terminal reminders that show up when you open a new shell

Usage:
  remind                Show due reminders (manual check)
  remind add            Create a new reminder
  remind list           Browse all reminders (TUI)
  remind init           Set up shell integration
  remind check          Check for due reminders (used by shell hook)
  remind --help         Show this help

Options for remind add:
  --body <text>         Reminder body (required for non-interactive mode)
  --title <text>        Optional title
  --once <YYYY-MM-DD>   One-time reminder on a specific date
  --recurring <interval> Recurring reminder (daily, weekly, monthly, every 3 months, every 6 months, every year)

Options for remind init:
  --shell <zsh|bash|fish>  Override shell detection
`.trim();

async function main() {
  switch (subcommand) {
    case undefined:
      await runManual();
      break;
    case "check":
      await runCheck();
      break;
    case "add":
      await runAdd(args);
      break;
    case "list":
      await runList();
      break;
    case "init":
      await runInit(args);
      break;
    case "--help":
    case "-h":
    case "help":
      console.log(USAGE);
      break;
    default:
      console.error(`Unknown command: ${subcommand}`);
      console.error("");
      console.error(USAGE);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
