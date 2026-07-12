/**
 * One-command local preview of the benchmark table that gets posted as the
 * sticky PR comment. Chains the existing pieces — test/bench/scripts/baselines.ts,
 * `pnpm bench`, and test/bench/scripts/compare.ts — so the rendered markdown comes
 * from the same `compare.ts` the privileged sticky-comment workflow uses;
 * this file adds no rendering of its own.
 *
 * Installs the published npm baselines into an outside-the-workspace temp
 * dir (the workspace `overrides` would otherwise swap them for local
 * source). If that fails — no network or npm unreachable — it warns and
 * renders a local-only preview instead of erroring, so the command always
 * produces output.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

const baselinesDir = path.join(os.tmpdir(), "cva-bench-baselines-preview");
const previewPath = path.join(repoRoot, "test/bench/.output/preview.md");

function run(command: string, args: string[], env = process.env) {
  execFileSync(command, args, { stdio: "inherit", env, cwd: repoRoot });
}

let haveBaselines = false;
try {
  run("node", [path.join(scriptsDir, "baselines.ts"), "--out", baselinesDir]);
  haveBaselines = true;
} catch {
  console.warn(
    "\nCouldn't install npm baselines (offline, or npm unreachable) — rendering a local-only preview.\n",
  );
}

run(
  "pnpm",
  ["bench"],
  haveBaselines
    ? { ...process.env, BENCH_BASELINES_DIR: baselinesDir }
    : process.env,
);

// Render through the same compare.ts CLI the sticky comment uses, so the
// preview is byte-identical to what a PR would show.
const markdown = execFileSync("node", [path.join(scriptsDir, "compare.ts")], {
  encoding: "utf8",
  cwd: repoRoot,
});
writeFileSync(previewPath, markdown);

console.log(`\nPreview written to ${previewPath}\n`);
console.log(markdown);
