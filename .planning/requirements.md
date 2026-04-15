# remind-cli Requirements

## Overview

A CLI tool (`remind`) for creating and displaying reminders at configured intervals. Reminders surface in the terminal when a new top-level interactive shell session is opened. Designed for speed — checking for due reminders must complete in under 100ms.

---

## Data Storage

**Format: SQLite via `bun:sqlite`**

Stored at `~/.remind-cli/reminders.db`.

Rationale over JSON: clean querying for "what's due", atomic writes, no file locking issues, efficient for archival filtering.

**Bundling note:** `bun:sqlite` is a Bun built-in. For distribution via npm, we use `bun build --compile` to produce a self-contained binary that bundles the Bun runtime — no runtime dependency on Node or Bun from the user's perspective. No known blockers.

### Schema

```sql
reminders (
  id          TEXT PRIMARY KEY,  -- crypto.randomUUID()
  title       TEXT,              -- optional short label
  body        TEXT NOT NULL,     -- required message
  type        TEXT NOT NULL,     -- 'once' | 'recurring'
  schedule    TEXT NOT NULL,     -- ISO date string (once) or interval descriptor (recurring)
  next_show   TEXT NOT NULL,     -- ISO date (YYYY-MM-DD), indexed — primary query field
  created_at  TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0  -- 1 = acknowledged/completed (one-time only)
)
```

`next_show` is the single field queried at shell startup. The check is:

```sql
SELECT * FROM reminders WHERE done = 0 AND next_show <= :today
```

---

## Reminder Model

| Field      | Required | Notes                                      |
| ---------- | -------- | ------------------------------------------ |
| `body`     | Yes      | The reminder message                       |
| `title`    | No       | Short optional label                       |
| `type`     | Yes      | `once` or `recurring`                      |
| `schedule` | Yes      | Date (once) or interval string (recurring) |

---

## Reminder Types & Acknowledgment

### One-time

- Shows starting on a specified date.
- **Acknowledge:** sets `done = 1`. Not shown again unless user views archived reminders via `remind list`.
- **Snooze:** no DB change. Shows again tomorrow when `remind check` runs.

### Recurring

- Defined by an interval: `daily`, `weekly`, `monthly`, `every N months`.
- `next_show` is set to the **start of the next interval** from creation:
  - `daily` → tomorrow
  - `weekly` → next Sunday
  - `monthly` → 1st of the next month
  - `every N months` → 1st of the month N months out
- Missed occurrences show **once** at the next opportunity — no stacking.
- **Acknowledge:** advances `next_show` to the next interval. `done` stays `0`.
- **Snooze:** no DB change. Shows again tomorrow when `remind check` runs.

**Fallback:** If start-of-interval anchoring proves significantly complex, fall back to anchoring relative to creation date (e.g., monthly from April 15 → May 15).

---

## Granularity & Daily Check Rule

Reminders are **date-granular only** — no time-of-day precision.

The automatic shell check runs **at most once per day** per the `last_check` file mechanism (see below). Snoozing a reminder means "not now" — it will reappear the next time the check logic runs (tomorrow's automatic check, or any manual `remind` invocation).

---

## Commands

| Command        | Description                                              |
| -------------- | -------------------------------------------------------- |
| `remind`       | Manual check: show all due unacknowledged reminders      |
| `remind add`   | Create a new reminder (interactive prompts or CLI flags) |
| `remind check` | Shell hook command: once-per-day automatic check         |
| `remind list`  | Open TUI to browse, edit, delete reminders               |
| `remind init`  | Configure shell integration                              |

---

### `remind` (bare command — manual)

- Queries all reminders where `done = 0 AND next_show <= today`.
- Does **not** read or write `last_check` — always runs.
- If reminders are due: shows the interactive display (same UI as `remind check`).
- If nothing is due:
  ```
  No reminders due. Run `remind list` to see all reminders.
  ```

---

### `remind check` (shell hook — automatic)

Called by the shell hook at session start. Must be **fast** (target: < 100ms).

**Flow:**

1. Read `~/.remind-cli/last_check`. If value is today's date → exit immediately (no output).
2. Write today's date to `~/.remind-cli/last_check`.
3. Query `SELECT * FROM reminders WHERE done = 0 AND next_show <= :today`.
4. If zero rows → exit silently.
5. If rows exist → show interactive display.

`last_check` is always written in step 2, regardless of whether the user acknowledges or snoozes. This ensures the check runs at most once per automatic shell open per day.

**Performance:** The single indexed SQLite query plus two file operations stays well under 100ms. A file-based caching layer (skip the SQLite call entirely on most days) is a post-MVP optimization if the target isn't met.

---

### `remind add`

**Interactive mode** (default — uses `@clack/prompts`):

1. Body (required text input)
2. Title (optional text input, skippable)
3. Type: once / recurring (select)
4. If once: date input (YYYY-MM-DD or natural language parsed by `date-fns`)
5. If recurring: interval selector (daily / weekly / monthly / every N months)

**Non-interactive mode** (CLI flags):

```
remind add --body "Review OKRs" --title "OKRs" --once 2026-05-01
remind add --body "Team sync prep" --recurring weekly
remind add --body "Quarterly review" --recurring "every 3 months"
```

---

### `remind init`

Adds a hook to the user's shell config that calls `remind check` on every new top-level interactive shell session.

**Supported shells:**

1. `zsh` → appends to `~/.zshrc`
2. `bash` → appends to `~/.bashrc` (falls back to `~/.bash_profile` if `.bashrc` absent)
3. `fish` → appends to `~/.config/fish/config.fish`

Shell is auto-detected via `$SHELL`. A `--shell <zsh|bash|fish>` flag allows manual override.

Re-running `remind init` is idempotent — checks for existing hook marker before appending.

**Injected snippets:**

zsh/bash:

```sh
# remind-cli
if [[ $SHLVL -eq 1 && $- == *i* ]]; then
  remind check
fi
```

fish:

```fish
# remind-cli
if status is-interactive && status is-login
  remind check
end
```

---

### `remind check` / `remind` — Display UI

Built with **Ink** (React-based terminal UI).

**Single reminder:**

```
┌─ Reminder ──────────────────────────────┐
│ Title (if set)                          │
│                                         │
│ Body text here...                       │
│                                         │
│ > Acknowledge    Snooze                 │
└─────────────────────────────────────────┘
```

**Multiple reminders:**

```
┌─ 3 Reminders Due ───────────────────────┐
│ • Title / body preview                  │
│ • Title / body preview                  │
│ • Title / body preview                  │
│                                         │
│ > Acknowledge all                       │
│   Snooze all                            │
│   Review individually...                │
└─────────────────────────────────────────┘
```

"Review individually" loops through each reminder showing the single-reminder UI.

**After snoozing** (any snooze action), display a brief message:

```
You can review your reminders anytime by running `remind`.
```

---

### `remind list` (TUI)

Built with **Ink**.

**Main screen:**

- Scrollable list of active reminders (title or body preview, next due date, type badge)
- Keyboard nav: `↑`/`↓` to move, `Enter` to open detail, `d` to delete, `a` to toggle archived view, `q`/`Esc` to quit
- Toggle to show archived reminders (acknowledged one-time reminders)

**Detail/edit screen:**

- View full body
- Edit title, body, schedule
- Delete with confirmation prompt
- `Esc`/`b` to go back

**Post-MVP:**

- Shortcut to launch `remind add` flow from within TUI
- Shortcut to run `remind init` from within TUI

---

## Shell Integration Details

Top-level interactive shell only. The SHLVL/interactive guards prevent the hook from firing in:

- Nested shells
- tmux/screen panes opened from an existing shell (SHLVL > 1)
- Non-interactive subshells (scripts, CI, etc.)

---

## Distribution

**npm package:** `remind-cli` — binary name: `remind`

```
npm install -g remind-cli
```

Built with `bun build --compile` → single self-contained binary. Users need neither Bun nor Node installed.

**Local development:**

```
bun run dev    # run from source via bun
bun run build  # compile binary
```

---

## Tech Stack

| Concern      | Choice                      |
| ------------ | --------------------------- |
| Runtime      | Bun                         |
| Language     | TypeScript                  |
| Database     | SQLite (`bun:sqlite`)       |
| IDs          | `crypto.randomUUID()`       |
| Dates        | `date-fns`                  |
| Prompts      | `@clack/prompts`            |
| TUI          | `ink` + `react`             |
| Formatting   | `oxfmt`                     |
| Distribution | `bun build --compile` → npm |

---

## Non-Goals (MVP)

- No cloud sync
- No OS/system notifications — terminal only
- No time-of-day granularity — date-level only
- No tags, priority, or metadata beyond title + body
- No "remind me later for N days" — snooze means "not now, show tomorrow"
- `remind add` / `remind init` shortcuts from within TUI (post-MVP)
- File-based caching layer for shell hook (post-MVP, add if < 100ms target isn't met)
