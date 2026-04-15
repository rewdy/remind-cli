# remind-cli Task Breakdown

## Phase 0 — Repo Cleanup

- [ ] Remove bun boilerplate (`index.ts` hello world content, `README.md` boilerplate)
- [ ] Update `package.json`: set name, version, bin entry (`remind`), add scripts (`dev`, `build`, `test`, `format`)
- [ ] Update `tsconfig.json`: remove `jsx` config (not a frontend project), tighten unused variable rules
- [ ] Install dependencies: `date-fns`, `@clack/prompts`, `ink`, `react`, `@types/react`
- [ ] Create source directory structure:
  ```
  src/
    cli/         # command entry points
    db/          # database layer
    reminders/   # reminder business logic
    shell/       # shell hook snippets
    ui/          # ink components
    utils/       # date helpers, etc.
  ```
- [ ] Create `src/index.ts` as main CLI entry point (command router)
- [ ] Verify `bun run dev` works

---

## Phase 1 — Database Layer

- [ ] Implement `src/db/client.ts`: open/create `~/.remind-cli/reminders.db`, run migrations on startup
- [ ] Implement schema migration: create `reminders` table with all fields and index on `next_show`
- [ ] Implement `src/db/reminders.ts`: CRUD operations
  - `getDueReminders(today: string)` — query for `done = 0 AND next_show <= today`
  - `getAllActive()` — for list TUI
  - `getArchived()` — `done = 1`
  - `createReminder(data)` — insert new row
  - `acknowledgeReminder(id)` — for one-time: set `done = 1`; for recurring: advance `next_show`
  - `updateReminder(id, data)` — edit fields
  - `deleteReminder(id)` — hard delete
- [ ] Implement `src/utils/dates.ts`: date helpers using `date-fns`
  - `computeNextShow(type, schedule, from?: Date)` — returns next `YYYY-MM-DD` string
  - `advanceRecurring(schedule, from: Date)` — advance to next interval
  - `parseScheduleInput(input: string)` — parse `"weekly"`, `"every 3 months"`, etc.
- [ ] Write tests for date helpers (`bun test`)

---

## Phase 2 — `remind check` (Shell Hook Command)

- [ ] Implement `src/utils/lastCheck.ts`: read/write `~/.remind-cli/last_check`
  - `hasCheckedToday()` → boolean
  - `writeLastCheck()` → write today's date
- [ ] Implement `src/cli/check.ts`:
  1. If `hasCheckedToday()` → exit 0 silently
  2. `writeLastCheck()`
  3. Query `getDueReminders(today)`
  4. If empty → exit 0 silently
  5. Render interactive display (Ink)
- [ ] Implement `src/ui/ReminderCheck.tsx`: Ink component for check display
  - Single reminder view: body, optional title, `Acknowledge` / `Snooze` actions
  - Multi-reminder view: list preview + `Acknowledge all` / `Snooze all` / `Review individually`
  - Post-snooze message: `You can review your reminders anytime by running \`remind\`.`
- [ ] Wire acknowledge/snooze actions to DB operations
- [ ] Manual smoke test: create a due reminder, run `remind check`, verify display and actions

---

## Phase 3 — `remind` (Bare Command — Manual Check)

- [ ] Implement `src/cli/manual.ts`:
  - Query `getDueReminders(today)` (no `last_check` logic)
  - If empty: print `No reminders due. Run \`remind list\` to see all reminders.`
  - If due: render same Ink display as `remind check`
- [ ] Ensure bare `remind` invocation routes here
- [ ] Manual smoke test

---

## Phase 4 — `remind add`

- [ ] Implement `src/cli/add.ts`: route to interactive or non-interactive mode based on flags
- [ ] Implement `src/cli/addInteractive.ts` using `@clack/prompts`:
  1. Text: body (required)
  2. Text: title (optional, skippable)
  3. Select: once / recurring
  4. If once: text input for date (`YYYY-MM-DD`)
  5. If recurring: select interval (daily / weekly / monthly / every 3 months / every 6 months / every year)
  - On complete: call `createReminder`, show success message
- [ ] Implement `src/cli/addFlags.ts`: parse `--body`, `--title`, `--once <date>`, `--recurring <interval>`, validate, call `createReminder`
- [ ] Validation: body required, date format check for once, interval enum check for recurring
- [ ] Manual smoke test: both interactive and flag modes

---

## Phase 5 — `remind init`

- [ ] Implement `src/shell/snippets.ts`: shell hook string constants for zsh/bash/fish
- [ ] Implement `src/cli/init.ts`:
  - Detect shell from `$SHELL` env var
  - Accept optional `--shell <zsh|bash|fish>` flag
  - Determine target config file path
  - Check if hook marker already present (idempotent)
  - Append snippet if not present
  - Print confirmation message with the config file path
- [ ] Manual test: run `remind init`, verify `.zshrc` updated, verify re-run is idempotent

---

## Phase 6 — `remind list` (TUI)

- [ ] Implement `src/ui/List.tsx`: main list screen
  - Scrollable list with `↑`/`↓` navigation
  - Each row: type badge (once/recurring), title or body preview, next due date
  - Key bindings: `Enter` → detail, `d` → delete confirm, `a` → toggle archived, `q`/`Esc` → quit
- [ ] Implement `src/ui/Detail.tsx`: detail/edit screen
  - Show full body and all fields
  - Edit mode: inline edit title, body, schedule
  - Delete with confirmation
  - `Esc`/`b` → back to list
- [ ] Implement `src/cli/list.ts`: fetch data, render `<List />` Ink app
- [ ] Manual smoke test: create several reminders, open list, navigate, edit, delete

---

## Phase 7 — CLI Router & Entry Point

- [ ] Implement `src/index.ts` as main entry: parse `process.argv` and route to:
  - `remind` (no subcommand) → `manual`
  - `remind add` → `add`
  - `remind check` → `check`
  - `remind list` → `list`
  - `remind init` → `init`
  - `remind --help` → usage text
  - Unknown subcommand → error + usage
- [ ] Update `package.json` `bin` field: `{ "remind": "./src/index.ts" }` (dev) / compiled path (build)
- [ ] Full end-to-end smoke test of all commands

---

## Phase 8 — Build & Distribution

- [ ] Configure `bun build --compile` in `package.json` build script
- [ ] Test compiled binary: all commands work without Bun installed
- [ ] Configure `package.json` for npm publish: `files`, `bin`, `engines`, keywords
- [ ] Write minimal `README.md`: install, quick start, command reference

---

## Post-MVP Backlog

- [ ] File-based caching layer: `~/.remind-cli/next_check` to skip SQLite call on most days
- [ ] `remind add` shortcut from within `remind list` TUI
- [ ] `remind init` shortcut from within `remind list` TUI
- [ ] Extended "remind me later" options (e.g., specific date, next week)
- [ ] oxlint integration
