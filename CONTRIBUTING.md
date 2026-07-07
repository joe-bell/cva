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

## Releases

A trade-off with using a personal repo is that permissions are fairly locked-down. In the mean-time releases will be made manually by the project owner.
