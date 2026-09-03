import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    // Benchmark files must run serially: parallel worker processes contend
    // for CPU and skew ops/sec. Scoped to bench runs (`vitest bench` sets
    // mode to "benchmark") so `pnpm test` keeps file parallelism.
    ...(mode === "benchmark" && { fileParallelism: false }),
    benchmark: {
      outputJson: "test/bench/.output/vitest-bench.json",
    },
    coverage: {
      include: [
        "packages/*/src/**/*.ts",
        "test/bench/scripts/**/*.ts",
        ".github/scripts/**/*.mjs",
      ],
      exclude: [
        "**/coverage/**",
        // Vitest excludes test files by default; explicit for clarity.
        "**/*.test.{ts,mjs}",
        // Benchmark definitions only run under `vitest bench` (serial mode,
        // against built dists) and measure timing, not correctness; their
        // orchestration logic lives in harness.ts, which is tested.
        "test/bench/scripts/*.bench.ts",
      ],
      thresholds: {
        // Applies to packages/*/src only: files matched by a glob threshold
        // below are removed from this global calculation.
        100: true,
        // Repo tooling currently measures 100% too; if a future defensive
        // `?.`/`??` half-branch proves untestable, prefer lowering these
        // globs' `branches` over adding v8-ignore comments.
        "test/bench/scripts/**/*.ts": { 100: true },
        ".github/scripts/**/*.mjs": { 100: true },
      },
    },
  },
}));
