import { runAddFlags } from "./addFlags";
import { runAddInteractive } from "./addInteractive";

export async function runAdd(args: string[]): Promise<void> {
  if (args.includes("--body")) {
    runAddFlags(args);
  } else {
    await runAddInteractive();
  }
}
