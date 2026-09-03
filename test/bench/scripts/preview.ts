/**
 * One-command local preview of the benchmark table that gets posted as the
 * sticky PR comment. Chains test/bench/scripts/baselines.ts, `pnpm bench`, and
 * test/bench/scripts/compare.ts so the rendered markdown comes from the same
 * `compare.ts` the privileged sticky-comment workflow uses; this file adds no
 * rendering of its own.
 *
 * Installs the published npm baselines into an outside-the-workspace temp
 * dir (the workspace `overrides` would otherwise swap them for local
 * source). If that fails (no network or npm unreachable), it warns and
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

export function main({
  exec = execFileSync,
  write = writeFileSync,
  env = process.env,
} = {}) {
  function run(command: string, args: string[], runEnv = env) {
    exec(command, args, { stdio: "inherit", env: runEnv, cwd: repoRoot });
  }

  let haveBaselines = false;
  try {
    run("node", [path.join(scriptsDir, "baselines.ts"), "--out", baselinesDir]);
    haveBaselines = true;
  } catch {
    console.warn(
      "\nCouldn't install npm baselines (offline, or npm unreachable); rendering a local-only preview.\n",
    );
  }

  run(
    "pnpm",
    ["bench"],
    haveBaselines ? { ...env, BENCH_BASELINES_DIR: baselinesDir } : env,
  );

  // Render through the same compare.ts CLI the sticky comment uses.
  const markdown = exec("node", [path.join(scriptsDir, "compare.ts")], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  write(previewPath, markdown);

  console.log(`\nPreview written to ${previewPath}\n`);
  console.log(markdown);
}

/* v8 ignore start -- process entrypoint (`pnpm bench:preview`); subprocess
   coverage isn't collected. */
function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  main();
}
/* v8 ignore stop */
