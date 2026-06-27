# AGENTS.md

## Current focus: `cva` beta 🧬

**Active development is on the `cva` beta** (`packages/cva`, published as
[`cva@beta`](https://www.npmjs.com/package/cva)). This is where the core focus
is right now — new features and fixes should target it first.

The original, stable package (`class-variance-authority`, in
`packages/class-variance-authority`) is in maintenance mode. Only touch it for
backports or stable-only bug fixes, and don't assume a change to one package
applies to the other — they are intentionally separate.

> **Note**
>
> `cva@beta` is not covered by semver and may change without warning. See
> [`packages/cva/README.md`](./packages/cva/README.md).

## Architecture

See [README.md](./README.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) before
getting started. Project documentation lives in the [docs](./docs/) directory.

This is a [pnpm](https://pnpm.io) workspace (Node `22`, see
[`.nvmrc`](./.nvmrc)). pnpm is enforced via `only-allow` — don't use npm or
yarn.

| Path                                  | What it is                                                            |
| ------------------------------------- | -------------------------------------------------------------------- |
| `packages/cva`                        | **Beta package** (`cva@1.0.0-beta.x`) — the current focus            |
| `packages/class-variance-authority`   | Stable package (`0.7.x`), maintenance only                           |
| `docs/beta`                           | Beta docs ([beta.cva.style](https://beta.cva.style), Astro Starlight) |
| `docs/latest`                         | Stable docs ([cva.style](https://cva.style), Next.js + Nextra)        |
| `examples/beta`, `examples/latest`    | Framework usage examples for each package                            |

## Commands

This project uses `nvm` to manage Node.js versions, so prefix commands with
`nvm use` where necessary. If you're Zed's agent you likely **won't** need to.

First-time setup (see [CONTRIBUTING.md](./CONTRIBUTING.md) for detail):

```sh
corepack enable
pnpm i
```

Run from the repo root:

- `pnpm dev` – runs vitest in watch mode
- `pnpm test` – runs the test suite with coverage
- `pnpm check` – type checks every package
- `pnpm build` – production build of the packages
- `pnpm bundlesize` – verifies bundle size limits (`size-limit`)
- `pnpm prettier --check .` – formatting check (`--write` to fix)
- `pnpm syncpack:lint` – checks dependency-version consistency across the
  workspace (`pnpm syncpack:fix` to fix)
- `pnpm docs` – runs the stable docs site locally

To scope a command to a single package, use pnpm filters, e.g.
`pnpm --filter cva test`.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  so changelogs can be generated on release.
- **Code** is formatted with [Prettier](https://prettier.io/) and written in
  [TypeScript](https://www.typescriptlang.org/) where possible.
- A `pre-commit` hook runs `lint-staged` (type check + Prettier + syncpack).
  Enable hooks with `pnpm prepare` if they aren't already.
- Be welcoming and respectful — see the
  [Code of Conduct](./CODE_OF_CONDUCT.md).

## Before you push

CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs `build`,
`bundlesize`, `check`, `prettier`, `syncpack`, and `test`. Run the matching
scripts locally so the bar is green before opening a PR.
