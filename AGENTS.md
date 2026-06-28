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

| Path                                | What it is                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/cva`                      | **Beta package** (`cva@1.0.0-beta.x`) — the current focus                                                                                                                      |
| `packages/class-variance-authority` | Stable package (`0.7.x`), maintenance only                                                                                                                                     |
| `docs`                              | Unified docs site ([cva.style](https://cva.style), Astro Starlight) — stable at the root, beta under `/beta` via [`starlight-versions`](https://starlight-versions.vercel.app) |
| `examples/beta`, `examples/latest`  | Framework usage examples for each package                                                                                                                                      |

## Docs styling

The `docs` site styles with **Tailwind CSS v4** via Starlight's official
integration (`@astrojs/starlight-tailwind` + `@tailwindcss/vite`, configured in
[`docs/astro.config.ts`](./docs/astro.config.ts) and
[`docs/src/styles/main.css`](./docs/src/styles/main.css)). See Starlight's
[CSS & Tailwind guide](https://starlight.astro.build/guides/css-and-tailwind/#tailwind-css).

When styling components, use Tailwind v4 utility classes — don't reach for
inline `style="…"`/`style={{ … }}` attributes or `<style>` tags. Prefer
variant utilities (e.g. `after:…`, `dark:…`) over scoped CSS, and arbitrary
values (e.g. `after:bg-[hsl(0,0%,98%)]`) when no token fits. Global styling
that can't be expressed as utilities belongs in `main.css` (`@apply`, theme
tokens), not in per-component `<style>` blocks.

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
- Don't manually force line wrapping in code or comments — write natural,
  unbroken lines and let the pre-commit hook's Prettier step handle wrapping
  and formatting.
