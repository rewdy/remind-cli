# remind-cli

Terminal reminders that show up when you open a new shell.

## Install

```sh
npm install -g @rewdy/remind-cli
```

**Or if you use [mise](https://mise.jdx.dev/) you can do this:**

```sh
mise use --global npm:@rewdy/remind-cli
```

## Quick Start

```sh
# Set up shell integration (run once)
remind init

# Create a reminder
remind add

# Or non-interactively
remind add --body "Review OKRs" --once 2026-05-01
remind add --body "Weekly team sync prep" --recurring weekly

# Browse all reminders
remind list
```

## How it works

Once `remind init` is run, `remind` hooks into your shell startup. The first time you open a terminal each day, any due reminders appear. You can acknowledge them (done) or snooze (show again tomorrow).

Run `remind` at any time to manually check for due reminders.

## Commands

| Command        | Description                                  |
| -------------- | -------------------------------------------- |
| `remind`       | Show due reminders                           |
| `remind add`   | Create a reminder (interactive or via flags) |
| `remind list`  | Browse, edit, and delete reminders           |
| `remind init`  | Set up shell integration                     |
| `remind check` | Internal — called by shell hook              |

## Recurring intervals

`daily`, `weekly`, `monthly`, `every 3 months`, `every 6 months`, `every year`

## Local Development

```sh
bun install
bun run dev          # run from source
bun test             # run tests
bun run build        # compile binary to dist/remind
```
