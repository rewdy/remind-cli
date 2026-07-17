# AGENTS.md

This file is the single source of truth for agents working in this repo (Claude Code, Codex, Cursor, and others). `CLAUDE.md` is just a one-line `@AGENTS.md` import.

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

- `client.ts` — opens `~/.remind-cli/reminders.db`, creates the directory if absent, runs idempotent schema migrations on every import. Imported as a side effect by `reminders.ts`. Picks the SQLite driver by runtime: `bun:sqlite` under Bun (dev), `node:sqlite` under Node (shipped bundle) — both expose the same `prepare()`/`exec()` surface via the `DB` interface. No native module, so there's no ABI to mismatch when a version manager switches Node (see `docs/decisions/001-sqlite-driver-and-distribution.md`).
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

- **SQLite driver**: never add a native SQLite dependency (e.g. `better-sqlite3`) — it breaks the shell hook under version managers via ABI mismatch. Use the built-ins: `node:sqlite` (Node) / `bun:sqlite` (Bun), abstracted behind `client.ts`. File I/O uses `node:fs`/`Bun.file` as appropriate.
- **Date strings**: all dates stored and compared as `YYYY-MM-DD` strings. Never store timestamps in the reminders table.
- **Interactive UI**: `@clack/prompts` for linear prompt flows (`remind add`, `remind init`). Ink for stateful interactive displays (`remind check`, `remind list`).
- **No new dependencies** without strong justification — the binary size is already ~62MB from bundling Bun.

## Architecture Decision Records (ADRs)

**Substantive decisions get an ADR in `docs/decisions/` so future agents and humans understand _why_ a choice was made, not just _what_ changed.** Capture an ADR for:

- New dependencies, libraries, or build-tooling choices
- Data-flow or persistence changes (e.g. the SQLite driver / distribution model)
- Distribution / packaging decisions (binary vs. npm bundle)
- Anything a reasonable reviewer would ask "why did they do it this way?"

Routine bug fixes, copy tweaks, and obvious one-line changes do **not** need an ADR.

**Workflow:** copy `docs/decisions/000-template.md` to `docs/decisions/NNN-short-title.md` (next number), fill in Context / Decision / Consequences. For a large or hard-to-reverse decision, **confirm direction with the developer before building**, the same way you'd confirm any non-trivial plan. The ADR is the durable record — keep it updated if the approach shifts, and mark it `Superseded` when a later ADR replaces it (don't delete it).

## Specs — write before you build

**A substantial feature gets a short spec, reviewed before coding.** Fixing a misunderstanding in a one-page spec costs minutes; fixing it in a finished implementation costs hours. Run `/ve-spec` to draft one. Trivial changes (a bug fix, a copy tweak, a small localized change) skip the spec — same bar as an ADR. A spec is the agreement on _what we're about to build_; an ADR records _why_ we made a specific choice inside it. Specs live in `docs/specs/` and are folded into the living docs (and any ADRs) once the feature ships — see "Keeping docs current."

## Keeping docs current

This repo's living docs are `AGENTS.md` and `README.md` (plus `docs/` for detail). `CLAUDE.md` is just a one-line `@AGENTS.md` import so Claude Code, Codex, Cursor, and other agents read the same guide — **edit `AGENTS.md`, never the shim.** At the end of a feature or fix:

- **Offer a docs pass** (or run `/ve-compound`). Check whether the change made any doc statement stale and fix it — a stale statement is worse than a missing one.
- **Compact, don't accumulate.** Fold a finished spec's or plan's durable facts into the living docs and remove the finished artifact. Two docs claiming to describe current state is how drift starts.
- **One fact, one home.** Capture decisions as ADRs, not as prose scattered across docs; link to the one home rather than copying it.
