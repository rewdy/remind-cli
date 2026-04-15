import { build } from "esbuild";
import { writeFileSync, chmodSync } from "node:fs";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/remind.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  jsx: "automatic",
  // Keep all node_modules external — Node resolves them at runtime.
  // This avoids CJS/ESM conflicts in ink/yoga-layout/signal-exit.
  packages: "external",
});

// Make the output executable
chmodSync("dist/remind.js", 0o755);

console.log("Built dist/remind.js");
