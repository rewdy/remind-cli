# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun run dev                          # run from source
bun run build                        # compile self-contained binary to dist/remind
bun test                             # run all tests
bun test src/utils/dates.test.ts     # run a single test file
bun run typecheck                    # tsc --noEmit, zero errors expected
bun run format                       # oxfmt .
```

The compiled binary (`dist/remind`) bundles the Bun runtime — users need neither Bun nor Node. It is gitignored and built on publish.

## Architecture

### Data layer (`src/db/`)

- `client.ts` — opens `~/.remind-cli/reminders.db` via `bun:sqlite`, creates the directory if absent, runs idempotent schema migrations on every import. Imported as a side effect by `reminders.ts`.
- `reminders.ts` — all CRUD. The `Reminder` interface is the canonical type used everywhere. `acknowledgeReminder` has split behavior: one-time reminders get `done = 1`; recurring reminders have `next_show` advanced via `advanceRecurring`.

### Date utilities (`src/utils/dates.ts`)

`Interval` is the union type for all valid recurring schedules. `computeNextShow` anchors to the **start of the next period** (next Sunday for weekly, 1st of next month for monthly, etc.) — not relative to today. `advanceRecurring` calls `computeNextShow` with the current `next_show` as the base, so recurring intervals chain correctly.

### Once-per-day guard (`src/utils/lastCheck.ts`)

`~/.remind-cli/last_check` holds a `YYYY-MM-DD` string. `remind check` reads it first and exits immediately if today's date matches — this is the primary performance mechanism keeping shell startup fast. `writeLastCheck` is called before querying the DB so even a snooze counts as "checked today."

### CLI commands (`src/cli/`)

Each command is a standalone async function exported from its own file. `src/index.ts` is a pure router — a `switch` on `process.argv[2]` that dispatches to each handler.

- `check.ts` — shell hook path: guards with `lastCheck`, then queries and renders
- `manual.ts` — bare `remind` command: always queries, no `lastCheck` involvement
- `add.ts` — routes to `addInteractive.ts` (when no `--body` flag) or `addFlags.ts`
- `init.ts` — detects shell from `$SHELL`, shows a `@clack/prompts` preview/confirm before writing the hook snippet to the user's shell config
- `list.ts` — thin entry point that fetches data and mounts the Ink TUI

### UI (`src/ui/`)

Both components are self-contained with all state colocated — no sub-components in separate files.

- `ReminderCheck.tsx` — used by both `check` and `manual` commands. Three-state machine: `multi` (list of due reminders) → `single` (one reminder with Acknowledge/Snooze) → `snooze` (auto-exits after 1500ms). Snooze never writes to the DB.
- `ReminderList.tsx` — the `remind list` TUI. Two screens (`list` / `detail`) managed by a `screen` state variable. All keyboard handling is in a single `useInput` hook guarded by the current screen. Delete is a two-step confirmation on both screens.

### Shell snippets (`src/shell/snippets.ts`)

The `HOOK_MARKER` string (`# remind-cli hook`) is used for idempotency detection in `init.ts`. The zsh/bash snippet guards with `$SHLVL -eq 1` to avoid firing in nested shells or tmux panes.

## Key conventions

- **Bun APIs over Node**: use `bun:sqlite`, `Bun.file`, `Bun.write` — not `better-sqlite3`, `fs.readFile`, etc.
- **Date strings**: all dates stored and compared as `YYYY-MM-DD` strings. Never store timestamps in the reminders table.
- **Interactive UI**: `@clack/prompts` for linear prompt flows (`remind add`, `remind init`). Ink for stateful interactive displays (`remind check`, `remind list`).
- **No new dependencies** without strong justification — the binary size is already ~62MB from bundling Bun.
