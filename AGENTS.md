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

## Keeping this guide current (self-improving)

This file is a living document, and keeping it accurate is part of the work — not a separate chore. Treat every session as a chance to teach the next one: when you discover something durable that would have saved you time had it been written down, record it here in the same change.

**What counts as a durable learning** (record it): a non-obvious convention or constraint; a gotcha that cost you a wrong turn; the fix to a mistake you'd otherwise repeat; a command/flag that's the "right" way to do something here; a surprising dependency or build/test interaction. If you'd want a teammate warned before they hit it, it belongs here.

**What doesn't** (leave it out): one-off task details, narration of what you did, anything already covered by [`CONTRIBUTING.md`](./CONTRIBUTING.md) or an existing section above, and speculation you haven't verified. Prefer editing an existing section when the learning refines something already documented; only add to the [Learnings](#learnings) log below when it doesn't fit anywhere else.

**How to record it**: keep entries short, specific, and actionable — state the rule and the reason, not the story. Follow the same Markdown conventions as the rest of this file (no hard-wrapped prose — one unbroken line per paragraph/bullet). Land the update in the _same_ commit as the change that taught you, so the guidance and the code move together. If a learning later proves wrong or obsolete, delete or correct it — stale guidance is worse than none.

## Architecture

This is a [pnpm](https://pnpm.io) workspace (Node `24`, see
[`.nvmrc`](./.nvmrc)). pnpm is enforced via `only-allow` — don't use npm or
yarn.

The dev/CI toolchain pins `engines.node` to the [`.nvmrc`](./.nvmrc) version. The `examples/` use a permissive range because they run on StackBlitz WebContainers, which ship an older, fixed Node, and the published library packages omit `engines.node` so they don't constrain consumers. Before changing any `engines.node` field, read the [Node.js versions](./CONTRIBUTING.md#nodejs-versions) section of [`CONTRIBUTING.md`](./CONTRIBUTING.md).

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
- **Formatting is part of the change, not a follow-up.** Before staging, run Prettier over the files you touched (`pnpm prettier --write <files>`) and stage the formatted result so it lands in the _same_ commit. Then confirm `git status` is clean. Never push a separate "prettier wrap"/formatting-only fixup commit to tidy up after yourself — that's noise, and it means the original commit was incomplete.
- **Never hard-wrap Markdown prose.** In Markdown (`.md` / `.mdx`) only, write each paragraph as one unbroken line and let the editor soft-wrap it — don't insert manual newlines to keep lines short. Prettier defaults to `proseWrap: "preserve"`, so it won't reflow Markdown prose for you, and any hard wraps get committed verbatim as noisy diffs. Everywhere else — code comments and commit bodies — do hard-wrap, keeping lines within Prettier's `printWidth` (`80`, set in [`.prettierrc.json`](./.prettierrc.json)).
- The `docs` site deploys via Cloudflare Workers Builds, and its build watch paths are configured in the Cloudflare dashboard UI (not `wrangler.jsonc`). See [Deployment](./docs/README.md#-deployment) in the docs README before changing how docs builds are scoped.
- To verify an `examples/` change in a real StackBlitz WebContainer before merging, open it from GitHub against your branch: `https://stackblitz.com/github/joe-bell/cva/tree/<branch>/<dir>`. Branch names containing slashes (e.g. `claude/my-feature`) resolve fine — StackBlitz parses them correctly against the trailing path, so no slash-free branch is needed.

## Learnings

Durable, hard-won lessons that don't fit a section above. See [Keeping this guide current](#keeping-this-guide-current-self-improving) for what belongs here and how to write it. Newest first; prune anything that's become wrong or obsolete.

- `CLAUDE.md` is a symlink to this file (`AGENTS.md`) — one source of truth serves both the Claude Code and generic-agent conventions. Edit `AGENTS.md`; don't try to write through the `CLAUDE.md` symlink (tools that refuse symlinks will error), and don't split them into two diverging files.
