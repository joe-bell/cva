# Contributing

Welcome, and thanks for your interest in contributing! Please take a moment to review the following:

## Project Goals

Keep these principles in mind when proposing changes — they help keep `cva`
focused:

- **Performance & minimal footprint** – keep the runtime tiny and
  dependency-light.
- **Strongly typed** – first-class TypeScript; let the types guide usage and
  catch mistakes.
- **Simplicity** – a small, predictable API surface that's easy to reason
  about.
- **Easy to extend** – compose cleanly with the wider ecosystem (e.g.
  Tailwind CSS-specific tooling).
- **Avoid reinventing the wheel** – lean on proven primitives rather than
  rebuilding them.
- **The perfect tool for design systems** – optimise for the people building
  and maintaining them.

## Style Guide

- **Commits** follow the ["Conventional Commits" specification](https://www.conventionalcommits.org/en/v1.0.0/). This allows for changelogs to be generated automatically upon release.
- **Code** is formatted via [Prettier](https://prettier.io/)
- **JavaScript** is written as [TypeScript](https://www.typescriptlang.org/) where possible.
- **`packages/cva`'s type exports**: any type that can appear _named_ (not structurally expanded) in a consumer's generated `.d.ts` when they compile with `declaration: true` must be `export`ed from `src/index.ts`, even if it's not meant for direct use — an unexported-but-nameable type breaks their build with a `TS4023`/`TS2459`-family error even though `cva`'s own build stays green. Not every type reachable from a public signature needs this: TypeScript structurally expands some of them (e.g. the call-signature parameter helpers) instead of naming them, so those stay unexported on purpose — export the minimum that a real consumer build fails to compile without (see `AGENTS.md`'s Learnings for how to check). These exports exist for that portability reason only, not as a feature we want people to reach for directly, so mark them with a short JSDoc saying so and don't add docs-site coverage for them. `packages/cva/src/index.test.ts` pins the current set, but only catches _losing_ one of these exports, not a new type that newly needs one.

## Getting Started

### Setup

1. [Fork the repo](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) and clone to your machine.
2. Create a new branch with your contribution.
3. In the repo, prior to any other installation steps, run:
   ```sh
   corepack enable
   ```
4. Install dependencies:
   ```sh
   pnpm i
   ```
   Installing also registers the git pre-commit hook: the `prepare:hooks` script sets `core.hooksPath` to [`.github/hooks`](./.github/hooks), whose `pre-commit` runs `pnpm lint-staged` against your staged files on every commit. Don't bypass it (`--no-verify`) — if it didn't fire, re-run `pnpm i` and check `git config core.hooksPath` prints `.github/hooks`.
5. Voilà, you're ready to go!

### Node.js versions

The repo targets the Node.js version in [`.nvmrc`](./.nvmrc) (used by `nvm` and CI). The root package's `engines.node` is the single source of truth, and `docs` follows it. The published library packages (`packages/cva`, `packages/class-variance-authority`) intentionally **omit** `engines.node` so they don't constrain consumers — cva runs on any reasonable Node, and a pin would just emit `EBADENGINE` warnings for anyone on an older Node. The dev/CI Node requirement is enforced by `.nvmrc`, the root `engines.node`, and CI, not by the libraries.

`syncpack` keeps the declared versions aligned via a custom type (configured under the `syncpack` key in the root [`package.json`](./package.json)): any non-example package that declares `engines.node` snaps to the root package's value, while the examples use their own `">=22"` pin. The field stays **optional** — packages without an `engines.node` (including the published libraries) aren't flagged. When you bump Node, update [`.nvmrc`](./.nvmrc) and the root `engines.node` together (everything else follows; only the examples' `">=22"` pin is separate), then run `pnpm syncpack:fix`.

The framework demos under [`examples/`](./examples) are the exception. They're embedded in the docs as live [StackBlitz](https://stackblitz.com) playgrounds, and StackBlitz runs them in a [WebContainer](https://webcontainers.io) — an in-browser Node.js that ships a **single, non-configurable** version (Node `22` at time of writing; Node `24` is [not yet supported](https://github.com/stackblitz/webcontainer-core/issues/560)). Pinning an example's `engines.node` to a version the WebContainer can't provide makes StackBlitz emit `EBADENGINE` "unsupported engine" warnings on install, so the examples deliberately use a permissive range (`">=22"`) that the WebContainer's Node satisfies. **Don't raise the examples' `engines.node` above what StackBlitz can run** — keep it as a lower-bound range, not an exact pin, until WebContainers ship the newer version.

### Scripts

Run these from the repo root:

- `pnpm dev` – runs vitest, watching for file changes
- `pnpm test` – runs the test suite with coverage
- `pnpm build` – production build of the packages
- `pnpm check` – type checks every package
- `pnpm bundlesize` – verifies bundle size limits (`size-limit`)
- `pnpm prettier --check .` – checks formatting (`--write` to fix)
- `pnpm syncpack:lint` – checks dependency-version consistency (`pnpm syncpack:fix` to fix)
- `pnpm lint:skills` – validates the agent skills in `.agents/skills` (`skill-check`, strict mode)
- `pnpm lint-staged` – runs the pre-commit checks against currently staged files (exactly what the pre-commit hook runs)

To scope a command to a single package, use a pnpm filter, e.g. `pnpm --filter cva test`.

CI runs `build`, `bundlesize`, `check`, `prettier`, `skills`, `syncpack`, and `test`, so run the matching scripts locally before opening a PR.

### Build & publish (`packages/*`)

Both published packages (`packages/cva` and `packages/class-variance-authority`) build with [tsdown](https://tsdown.dev), each configured by its own `tsdown.config.mts` (e.g. [`packages/cva/tsdown.config.mts`](./packages/cva/tsdown.config.mts)). One `pnpm --filter <package> build` emits the whole dual-format output to `dist/` — `index.js` + `index.d.ts` (CommonJS) and `index.mjs` + `index.d.mts` (ESM). Each config pins that package's historical published shape via its `outExtensions` callback (tsdown would otherwise default the CommonJS side to `.cjs`/`.d.cts`), so the two configs differ only where the packages genuinely differ (entry points, sourcemaps, gate options — the comments in each config explain the differences).

#### How the packages transform for publish

The `exports` and `publishConfig.exports` blocks in each package's `package.json` are **machine-generated**: the config's `exports: { devExports: true }` makes tsdown rewrite both on every build. **Never hand-edit them** — the next build silently overwrites your change; adjust that package's `tsdown.config.mts` instead. (One exception: `class-variance-authority`'s `publishConfig.typesVersions` — the node10 fallback for its `./types` subpath — is hand-maintained; tsdown doesn't generate it but preserves it across rebuilds.) The two blocks implement a dev/publish split:

- The top-level `exports` points at `./src/*.ts`, so workspace consumers (tests, examples, docs) always resolve the raw TypeScript source with no build step in between.
- `publishConfig.exports` points at `dist/`. pnpm applies `publishConfig` when packing or publishing (`pnpm pack` / `pnpm publish` — never `npm pack`, which skips the rewrite entirely), so the tarball people install resolves the built output.

Two details of the published map are deliberate:

- There are no explicit `types` conditions — TypeScript auto-pairs `index.mjs` → `index.d.mts` and `index.js` → `index.d.ts`, which means `import`-ing consumers get true ESM declarations rather than a shared CommonJS-flavoured `.d.ts`. The attw gate (below) verifies all four resolution modes stay green.
- `"./package.json": "./package.json"` is exported because declaring an `exports` map encapsulates every unlisted subpath, which would break tooling that reads a dependency's `package.json` directly (bundler plugins, Metro, framework CLIs doing version detection). tsdown adds the line by default; it exposes nothing new — the file ships in every tarball regardless.

#### The config, option by option

Each package's `tsdown.config.mts` documents each option's rationale as a comment directly above it — read those before changing `platform`, `target`, `dts`, `outExtensions`, `exports`, or the `publint`/`attw`/`unused` gates, rather than looking here.

What tsdown does **not** own: `size-limit` remains the bundle-size budget (tsdown's per-file gzip size report is informational only), the `tsc --noEmit` check remains the source type check, and version bumps stay manual per [Releases](#releases).

Day to day: `pnpm --filter <package> dev` runs the build in watch mode, and because the root `prepare:packages` script builds on every `pnpm install`, the publish-shape gates run then too — a broken manifest fails fast on your machine rather than in CI. If that per-install cost ever becomes a problem, `attw: 'ci-only'` in the config confines the slowest gate to CI.

## Releases

A trade-off with using a personal repo is that permissions are fairly locked-down. In the mean-time releases will be made manually by the project owner.

Version bumps (the `version` field in `packages/*/package.json`) are part of that manual release process — they happen only on `main`, cut by the project owner, as their own commit separate from any feature/fix work. Don't include a version bump in a feature or fix branch/PR, even if you're an agent implementing a versioned change like "cut vX.Y.Z" — leave that step to the owner on `main`.
