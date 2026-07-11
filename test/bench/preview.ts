/**
 * One-command local preview of the benchmark table that gets posted as the
 * sticky PR comment. Chains the existing pieces — test/bench/baselines.ts,
 * `pnpm bench`, and test/bench/compare.ts — so the rendered markdown comes
 * from the same `compare.ts` the CI job summary and the privileged
 * sticky-comment workflow use; this file adds no rendering of its own.
 *
 * Installs the published npm baselines into an outside-the-workspace temp
 * dir (the workspace `overrides` would otherwise swap them for local
 * source). If that fails — no network, GitHub API or npm unreachable — it
 * warns and renders a local-only preview instead of erroring, so the
 * command always produces output.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const baselinesDir = path.join(os.tmpdir(), "cva-bench-baselines-preview");
const previewPath = "test/bench/.output/preview.md";

function run(command: string, args: string[], env = process.env) {
  execFileSync(command, args, { stdio: "inherit", env });
}

let haveBaselines = false;
try {
  run("node", ["test/bench/baselines.ts", "--out", baselinesDir]);
  haveBaselines = true;
} catch {
  console.warn(
    "\nCouldn't install npm baselines (offline, or GitHub/npm unreachable) — rendering a local-only preview.\n",
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
const markdown = execFileSync("node", ["test/bench/compare.ts"], {
  encoding: "utf8",
});
writeFileSync(previewPath, markdown);

console.log(`\nPreview written to ${previewPath}\n`);
console.log(markdown);
