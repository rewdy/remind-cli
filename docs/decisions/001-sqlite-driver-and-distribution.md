# 001. SQLite driver and distribution model

- **Status:** Accepted
- **Date:** 2026-07-17
- **Deciders:** Andrew Meyer

## Context

`remind` is invoked from a shell-startup hook (`remind check`), so it runs in whatever
directory and toolchain context the user happens to open a shell in. That includes directories
where a version manager (mise, nvm, asdf) has pinned an arbitrary Node version.

The project originally used Bun's built-in SQLite (`bun:sqlite`) and `Bun.file`/`Bun.write`.
Commit `17ffe29` replaced these with `better-sqlite3` + `node:fs`, bundled via esbuild targeting
Node, **specifically to distribute as a cross-platform Node package** (a `bun build --compile`
binary is platform-specific and would require a publish matrix). That trade-off is documented in
the project's agent memory but was never captured as an ADR.

That decision surfaced a correctness bug. `better-sqlite3` is a **native module**: its compiled
`.node` file is built against one specific Node ABI (`NODE_MODULE_VERSION`). When a version
manager activates a different Node than the one `remind` was installed under, the shell hook runs
`remind check` against a mismatched ABI and Node refuses to load the module — breaking shell
startup with a `NODE_MODULE_VERSION` error. For a tool whose whole job is to run silently at shell
startup, this is a serious fragility.

A further firm constraint was set during this discussion: **`remind` should be published for
everyone via public npm**, not just used locally. Public npm packages are inherently
cross-platform, which rules out any approach that sacrifices that property.

## Decision

Two options were weighed against the "public, cross-platform npm" constraint:

- **Option A — compiled binary (`bun build --compile`).** Embeds the Bun runtime; immune to the
  ambient toolchain; brings back `bun:sqlite` (no native module). But the binary is
  **per-platform**, so publishing for everyone requires a platform-matrix release pipeline
  (darwin-arm64/x64, linux-x64/arm64, windows-x64) shipped as optional-dependency packages —
  significant, ongoing release complexity.
- **Option B — `node:sqlite` (Node's built-in SQLite).** Delete `better-sqlite3` entirely,
  eliminating the only native module and the entire ABI-mismatch class of bug. Keeps the existing
  pure-JS esbuild bundle and single cross-platform npm artifact. Smaller change; removes a
  dependency (aligns with the "no new dependencies" convention).

**Proposed: adopt Option B.** For a public, cross-platform npm tool, `node:sqlite` removes the root
cause (native-module ABI) with the least distribution complexity while preserving the
single-artifact publish model.

## Consequences

**Easier / better:**

- Root-cause fix: no native module ⇒ no ABI mismatch ⇒ shell hook survives any version manager.
- One dependency removed; distribution model (esbuild bundle → npm) is unchanged.

**Harder / to watch:**

- **Experimental warning.** `node:sqlite` is still experimental and emits
  `ExperimentalWarning: SQLite is an experimental feature` to stderr. Because this fires on **every
  new shell** via the hook, it MUST be suppressed deliberately (e.g. `--disable-warning`,
  `NODE_NO_WARNINGS`, or an `emitWarning` intercept) or it's arguably worse than the bug being
  fixed.
- **Higher Node floor.** The `--experimental-sqlite` flag was only dropped ~Node 22.13 / 23.4.
  `engines.node` currently claims `>=22`, which would be a lie for 22.5–22.12 users. Bump the floor
  (e.g. `>=22.13`, or `>=24` to be safe) and add a runtime version guard with a friendly error.
- **API rewrite.** `node:sqlite` (`DatabaseSync`) is similar to but not identical to
  `better-sqlite3`; `src/db/client.ts` and `reminders.ts` need a small, contained rewrite.
- **Stale convention.** The "Bun APIs over Node" convention in `AGENTS.md` predates commit
  `17ffe29` and no longer matches reality. It must be updated to reflect the Node + `node:sqlite`
  reality when this decision is accepted.

## Alternatives considered

- **Status quo (`better-sqlite3`).** Rejected — it's the source of the ABI-mismatch bug.
- **Option A (compiled binary matrix).** Deferred, not rejected — technically the most robust
  (fully runtime-independent) but too much release complexity for a public npm tool. Revisit if
  `node:sqlite`'s experimental status or Node-floor requirement proves unacceptable.
- **`npm rebuild better-sqlite3` on install.** Rejected as a fix — a band-aid that re-breaks on the
  next version-manager switch.
