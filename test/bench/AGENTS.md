# AGENTS.md

## Benchmark baseline learnings

Applies when working under `test/bench`.

These are the same durable learnings the root [`AGENTS.md`](../../AGENTS.md) records, scoped here so they load only when relevant. Keep them current the same way — see [Keeping this guide current](../../AGENTS.md#keeping-this-guide-current-self-improving).

- [`test/bench/scripts/baselines.ts`](../../test/bench/scripts/baselines.ts) installs published baselines with `pnpm add --ignore-scripts` so npm lifecycle scripts in baseline packages cannot run in the untrusted CI job.

- Benchmark baselines must resolve npm dist-tags separately for each package: `cva` and `class-variance-authority` share a repository but have independent release lines, so a repository GitHub tag cannot identify both packages' baseline versions. `cva` keeps npm `latest` at `0.0.0` (so it doesn't overwrite stable) and only `beta` is a meaningful baseline; `class-variance-authority` publishes stable to `latest` and has no `beta` dist-tag — see `PACKAGE_BASELINES` in [`test/bench/scripts/baselines.ts`](../../test/bench/scripts/baselines.ts).
