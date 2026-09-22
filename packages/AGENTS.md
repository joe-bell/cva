# AGENTS.md

## Package build learnings

Applies when working under `packages` — both published packages share this build pipeline.

These are the same durable learnings the root [`AGENTS.md`](../AGENTS.md) records, scoped here so they load only when relevant. Keep them current the same way — see [Keeping this guide current](../AGENTS.md#keeping-this-guide-current-self-improving).

- Both published packages (`packages/cva`, `packages/class-variance-authority`) build with [`tsdown`](https://tsdown.dev) — the full pipeline (publish transform, config feature reference, what each build-time gate checks) is documented in [CONTRIBUTING.md's Build & publish section](../CONTRIBUTING.md#build--publish-packages); read it before touching either build. The agent-critical gotchas: each `package.json`'s `exports`/`publishConfig.exports` blocks are **regenerated on every build** — never hand-edit them, change that package's `tsdown.config.mts` (or the shared `.config/tsdown.base.mts`) instead (exception: the hand-maintained `publishConfig.typesVersions` blocks — `class-variance-authority`'s `./types` and `cva`'s `./config` and `./tools` node10 fallbacks — which tsdown preserves but doesn't generate); a red build from the attw/publint/unused gates means the _publish shape_ broke, not the source (tsdown's pack step applies `publishConfig` — verified by breaking `dts` and watching the gates fail); and always `pnpm pack`, never `npm pack`, since only pnpm applies the `publishConfig` exports rewrite.
