import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { confirm, note, cancel, isCancel } from "@clack/prompts";
import { HOOK_MARKER, ZSH_SNIPPET, BASH_SNIPPET, FISH_SNIPPET } from "../shell/snippets.ts";

export async function runInit(args: string[]): Promise<void> {
  // Determine target shell
  let shell: string | undefined;

  const shellFlagIndex = args.indexOf("--shell");
  if (shellFlagIndex !== -1) {
    shell = args[shellFlagIndex + 1];
  } else {
    const envShell = process.env["SHELL"] ?? "";
    if (envShell.includes("zsh")) {
      shell = "zsh";
    } else if (envShell.includes("bash")) {
      shell = "bash";
    } else if (envShell.includes("fish")) {
      shell = "fish";
    }
  }

  if (!shell || !["zsh", "bash", "fish"].includes(shell)) {
    console.error("Error: could not detect shell. Use --shell <zsh|bash|fish>");
    process.exit(1);
  }

  const home = process.env["HOME"] ?? "";

  // Determine config file path
  let configPath: string;
  if (shell === "zsh") {
    configPath = `${home}/.zshrc`;
  } else if (shell === "bash") {
    const bashrc = `${home}/.bashrc`;
    configPath = existsSync(bashrc) ? bashrc : `${home}/.bash_profile`;
  } else {
    // fish
    const fishConfigDir = `${home}/.config/fish`;
    mkdirSync(fishConfigDir, { recursive: true });
    configPath = `${fishConfigDir}/config.fish`;
  }

  // Read existing content
  let existing = "";
  if (existsSync(configPath)) {
    existing = await readFile(configPath, "utf8");
  }

  // Idempotency check
  if (existing.includes(HOOK_MARKER)) {
    console.log(`Shell integration already configured in ${configPath}. Nothing to do.`);
    return;
  }

  // Show preview and confirm
  const snippet = shell === "zsh" ? ZSH_SNIPPET : shell === "bash" ? BASH_SNIPPET : FISH_SNIPPET;

  note(snippet.trim(), `The following will be added to ${configPath}`);

  const confirmed = await confirm({ message: "Continue?" });
  if (isCancel(confirmed) || !confirmed) {
    cancel("Cancelled.");
    process.exit(0);
  }

  await writeFile(configPath, existing + "\n" + snippet, "utf8");

  console.log(`Shell integration added to ${configPath}.`);
  console.log(`Open a new terminal session to activate, or run: source ${configPath}`);
}
