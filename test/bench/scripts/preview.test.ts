import type { execFileSync } from "node:child_process";
import type { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { main } from "./preview";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const baselinesDir = path.join(os.tmpdir(), "cva-bench-baselines-preview");
const previewPath = path.join(repoRoot, "test/bench/.output/preview.md");

const MARKDOWN = "## Benchmarks (fake)";

// Returns markdown for the compare.ts invocation (the only `encoding` call)
// and undefined for the stdio-inherited baseline/bench runs, like the real
// execFileSync would.
function fakeExec({ failBaselines = false } = {}) {
  return vi.fn(
    (command: string, args: string[], options?: { encoding?: string }) => {
      if (failBaselines && args.some((arg) => arg.endsWith("baselines.ts"))) {
        throw new Error("npm unreachable");
      }
      return options?.encoding ? MARKDOWN : undefined;
    },
  ) as unknown as typeof execFileSync;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("preview main", () => {
  it("installs baselines, benches against them and writes the preview", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const exec = fakeExec();
    const write = vi.fn() as unknown as typeof writeFileSync;
    const env = { PATH: "/usr/bin" } as NodeJS.ProcessEnv;

    main({ exec, write, env });

    expect(exec).toHaveBeenNthCalledWith(
      1,
      "node",
      [path.join(scriptsDir, "baselines.ts"), "--out", baselinesDir],
      { stdio: "inherit", env, cwd: repoRoot },
    );
    expect(exec).toHaveBeenNthCalledWith(2, "pnpm", ["bench"], {
      stdio: "inherit",
      env: { ...env, BENCH_BASELINES_DIR: baselinesDir },
      cwd: repoRoot,
    });
    expect(exec).toHaveBeenNthCalledWith(
      3,
      "node",
      [path.join(scriptsDir, "compare.ts")],
      { encoding: "utf8", cwd: repoRoot },
    );
    expect(write).toHaveBeenCalledWith(previewPath, MARKDOWN);
    expect(log).toHaveBeenCalledWith(MARKDOWN);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to a local-only preview when installing baselines fails", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const exec = fakeExec({ failBaselines: true });
    const write = vi.fn() as unknown as typeof writeFileSync;
    const env = { PATH: "/usr/bin" } as NodeJS.ProcessEnv;

    main({ exec, write, env });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("local-only preview"),
    );
    expect(exec).toHaveBeenNthCalledWith(2, "pnpm", ["bench"], {
      stdio: "inherit",
      env,
      cwd: repoRoot,
    });
    expect(write).toHaveBeenCalledWith(previewPath, MARKDOWN);
  });
});
