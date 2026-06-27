# AGENTS.md

## Current focus: `cva` beta

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

This is a [pnpm](https://pnpm.io) workspace (Node `22`, see
[`.nvmrc`](./.nvmrc)). pnpm is enforced via `only-allow` — don't use npm or
yarn.

| Path                                | What it is                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| `packages/cva`                      | **Beta package** (`cva@1.0.0-beta.x`) — the current focus             |
| `packages/class-variance-authority` | Stable package (`0.7.x`), maintenance only                            |
| `docs/beta`                         | Beta docs ([beta.cva.style](https://beta.cva.style), Astro Starlight) |
| `docs/latest`                       | Stable docs ([cva.style](https://cva.style), Next.js + Nextra)        |
| `examples/beta`, `examples/latest`  | Framework usage examples for each package                             |

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) is the single source of truth for project
goals, setup, scripts, and conventions (Conventional Commits, Prettier,
TypeScript) — follow it rather than duplicating its guidance here. All
participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).

Agent-specific notes:

- This project uses `nvm` to manage Node.js versions, so prefix commands with
  `nvm use` where necessary. If you're Zed's agent you likely **won't** need
  to.
- A `pre-commit` hook runs `lint-staged` (type check, Prettier, syncpack)
  against staged changes. Make sure it runs before pushing — if it doesn't
  fire in your environment, run it manually against the staged changes with
  `pnpm lint-staged`.
- Don't manually force line wrapping in code or comments — let Prettier handle
  formatting. Write natural, unbroken lines and rely on `pnpm prettier --write`
  (and the pre-commit hook) to wrap them.
