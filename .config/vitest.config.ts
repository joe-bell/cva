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
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/coverage/**"],
    },
  },
}));
