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

## Docs writing

Docs prose (`docs/src/content/docs/**`) follows the `writing-guidelines` skill (see [Task-specific skills](#task-specific-skills-agentsskills) below) — apply it whenever writing or editing docs content, not only when explicitly asked for a review pass. It layers this repo's house style (US English, no em/en-dash punctuation, verified `// =>` output comments, the beta/stable split, preserved author voice in FAQs/What's New) on top of the fetched upstream Vercel ruleset. Every page requires a `description` in its frontmatter — `docs/src/content.config.ts` enforces this via the Starlight schema, so a missing one fails the docs build.

## Task-specific skills (`.agents/skills/`)

Project skills live in `.agents/skills/` — the **single source of truth**; agent-specific directories only ever mirror it. They follow the [Agent Skills spec](https://agentskills.io/specification.md) (one `SKILL.md` per directory). Invoke the matching skill before working in that area. `pnpm lint:skills` validates each `SKILL.md` (`skill-check`, strict mode); it runs in pre-commit (via `lint-staged`) and in CI.

Supported agent mirrors:

- **Claude Code** — `.claude/skills/<name>` is a relative symlink (`../../.agents/skills/<name>`), committed to git as a symlink. Don't edit `.claude/skills/` directly or add real files there — nothing mechanical blocks a real file under `.claude/skills/` (git tracks the whole subtree), so it's on you not to commit one.
- **Everything else** (Cursor, Codex, Amp, …) — reads the universal `.agents/skills/` directory natively; no mirror needed. Add a mirror entry here if we ever adopt an agent that needs one.

The symlink wiring is **not mechanically enforced right now** — a structural drift check may be added later; only `skill-check` runs in lint. Until then, keeping the mirrors correct is on you: whenever you add, remove, rename, or update a skill, fix the `.claude/skills/` symlinks in the same change and keep the list below accurate. If you notice drift you didn't cause (a missing/orphaned/real-file entry in `.claude/skills/`, or this doc disagreeing with the directories), **warn about it in your summary** and fix it in the same change.

Note the committed symlinks (here and in [MCP servers](#mcp-servers-mcpjson)) require a symlink-capable checkout: on Windows without Developer Mode (`core.symlinks=false`), git materializes them as plain text files and the mirrors silently stop working.

Vendored skill files are excluded from Prettier ([`.prettierignore`](./.prettierignore)) so the committed bytes stay exactly what `npx skills` installed and the `skills-lock.json` hashes remain valid — don't format or hand-edit them beyond deliberate, documented tweaks (and re-run `npx skills` tooling rather than editing hashes by hand; if you must recompute, use the CLI's folder-hash algorithm).

Installed skills:

- `tailwind-css-v4` — Tailwind CSS v4 syntax and the v3→v4 differences (CSS-first `@theme` config, renamed/removed utilities, container queries, new features); use alongside the [Docs styling](#docs-styling) rules whenever touching styles. Hand-maintained in this repo (vendored, not installed from a registry), so it's not tracked in `skills-lock.json`.
- `deslop` — removes AI-generated slop (redundant comments, needless defensive code, `any` casts, deep nesting) from a branch's diff; use when cleaning up agent-written changes before merging. Sourced from `cursor/plugins` (carries a local "Use when" description tweak).
- `web-design-guidelines` — accessibility/UX review checklist; use when reviewing or building UI in `docs`
- `writing-guidelines` — prose style review; use when writing or reviewing docs content (see [Docs writing](#docs-writing) above). Sourced from `vercel-labs/agent-skills`; carries a local house-style addendum on top of the fetched upstream ruleset — re-apply it if `npx skills update` clobbers it, and recompute the hash per the note above
- `security-review` — OWASP-based, confidence-gated vulnerability review (reports only high-confidence, exploitable findings after tracing data flow); part of the core contribution workflow — use before pushing changes that touch executable code (see [Security review](#security-review-run-it-on-code-changes) below). Sourced from `getsentry/skills` (no local tweak; its description already carries "Use when" and its `SKILL.md` is a short index over `references/`/`languages/`/`infrastructure/` guides, so it's under the 500-line cap as-is)
- `find-skills` — discovers and installs further skills from the ecosystem; use when a task could benefit from a skill we don't have yet
- `wrangler` — Cloudflare Workers CLI + `wrangler.jsonc` reference; use when touching the `docs` deployment (the docs site is an Astro Worker via `@astrojs/cloudflare`, configured in [`docs/wrangler.jsonc`](./docs/wrangler.jsonc) and deployed through Workers Builds). Sourced from `cloudflare/skills`; carries a local "Use when" description tweak, and its long body was split into `references/*.md` via `skill-check split-body` to satisfy the 500-line cap (see below).

Except where a bullet says otherwise, skills are sourced from [skills.sh](https://skills.sh) and pinned by hash in [`skills-lock.json`](./skills-lock.json). To add one: `npx skills add <owner>/<repo> --skill <name> -a universal -y` (installs into `.agents/skills/` and records it in `skills-lock.json`), then create the matching `.claude/skills/<name>` relative symlink and run `pnpm lint:skills`.

`skill-check --strict` requires every skill description to contain "Use when" phrasing, so a third-party skill may need a small local description tweak to pass (`find-skills` carries one, `deslop` too). `npx skills update` overwrites local tweaks — re-run `pnpm lint:skills` after updating and re-apply if needed. Beware that `npx skills check` is **not** read-only: it refreshes every lock-tracked skill from upstream just like `update`, clobbering local tweaks and rewriting `skills-lock.json` hashes — don't run it casually, and revert any skills you didn't mean to update. After re-applying a tweak, recompute that skill's `computedHash` with the CLI's folder-hash algorithm (sha256 over the skill dir's files, sorted by relative path, hashing each path then content) — the committed hashes cover the _tweaked_ local content, not pristine upstream.

`skill-check --strict` also caps a `SKILL.md` body at **500 lines**. A large upstream skill (e.g. `wrangler`) fails this on install; the sanctioned fix is `npx skill-check split-body <skill-dir> --write`, which extracts each section into `references/*.md` and rewrites `SKILL.md` as a short index. Run it, then apply the "Use when" tweak and recompute the folder hash (it now spans `SKILL.md` **plus** every `references/*.md`). Don't hand-trim the body to dodge the cap — splitting preserves the upstream content verbatim (just relocated), which the folder hash still covers.

**Curation is part of the self-improving loop.** If a task would benefit from a skill we don't have, use `find-skills` to look for one and recommend it (or add it, when the change is in scope); if a skill proves stale, superseded, or unused, update or remove it — deleting its `.agents/skills/` directory, its `.claude/skills/` symlink, its `skills-lock.json` entry, and its bullet above in the same change. After `npx skills update`, review the diff and re-run `pnpm lint:skills`.

**Safety:** a skill is instructions the agent will follow, so treat adding or updating one like adding a dependency. Prefer reputable, widely-used sources; read the incoming `SKILL.md` content on install and on every update (`skill-check` runs with `--no-security-scan`, so content review is manual); never silently change a skill's `source` in `skills-lock.json`; and land skill changes via PR like any other code.

There is deliberately no `astro` skill: Astro guidance comes from the official Astro Docs MCP server instead — see [MCP servers](#mcp-servers-mcpjson) below. Query it when working on the `docs` site.

## MCP servers (`.mcp.json`)

[`.mcp.json`](./.mcp.json) at the repo root is the **single source of truth** for project MCP server config (Claude Code reads it directly); editor-specific configs only ever mirror it:

- **Cursor** — `.cursor/mcp.json` is a committed relative symlink to `../.mcp.json` (Cursor shares the `mcpServers` schema). Don't replace it with a real file.
- **VS Code** — [`.vscode/mcp.json`](./.vscode/mcp.json) **cannot be a symlink**: VS Code expects a different schema (`servers` instead of `mcpServers`) and silently ignores configs in the wrong one, so it's a real file — plain JSON, no comments — kept in sync **by hand**. When changing `.mcp.json`, mirror the change there in the same commit.
- **Zed** — the `context_servers` block in [`.zed/settings.json`](./.zed/settings.json) **cannot be a symlink either**: Zed uses its own schema (`context_servers`, with `url` for remote servers) inside its general project-settings file, so it's also kept in sync **by hand** in the same commit as any `.mcp.json` change.

None of this is mechanically enforced either — the same drift rule as the [skills mirrors](#task-specific-skills-agentsskills) applies here: keep the Cursor symlink intact, keep the VS Code and Zed mirrors in sync in the same commit, keep this section accurate, and warn about drift you didn't cause. Add a mirror entry here if we ever support another editor/agent config.

Currently configured: the official [Astro Docs MCP server](https://github.com/withastro/docs-mcp) (streamable HTTP at `https://mcp.docs.astro.build/mcp`), replacing an `astro` skill.

Curate the server list like the skills: recommend (or add) a server when recurring work would benefit, remove one that stops earning its place — updating every mirror and this section in the same change — and stick to official/reputable endpoints over HTTPS, since MCP servers feed tools and content straight to the agent.

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) is the single source of truth for project
goals, setup, scripts, and conventions (Conventional Commits, Prettier,
TypeScript) — follow it rather than duplicating its guidance here. All
participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).

### Commit workflow: the pre-commit hook is mandatory

This is policy, not a suggestion. Read it before every commit; it applies to every agent, every session, and every commit, with no exceptions.

1. **Every commit MUST go through the repo's pre-commit hook** — [`.github/hooks/pre-commit`](./.github/hooks/pre-commit), wired up via `git config core.hooksPath .github/hooks` (registered by the `prepare:hooks` script whenever `pnpm install` runs). It runs `pnpm lint-staged` against the staged files (type check, Prettier, syncpack, skills lint — config in [`.config/lint-staged.config.mjs`](./.config/lint-staged.config.mjs)). Committing with `git commit --no-verify` (or `-n`), unsetting or redirecting `core.hooksPath`, or any equivalent bypass is **forbidden**.
2. **A silently-missing hook is never a pass.** Verify the hook actually fired: a real run prints lint-staged task output (e.g. `Running tasks for staged files...`) between your `git commit` invocation and the commit summary — silence means it did not run. To check the wiring directly, `git config core.hooksPath` must print `.github/hooks`; on a fresh clone before `pnpm install` it is **unset**, and git then commits without running any checks at all.
3. **If the hook did not run for any reason** (fresh clone before install, `core.hooksPath` unset, `pnpm`/`lint-staged` missing from `PATH`), run the underlying check manually against the staged files before committing: bootstrap the toolchain first if needed (`nvm use && corepack enable && pnpm install`), then run `pnpm lint-staged`.
4. **Self-repair is mandatory, in the same session.** Don't stop at the manual run — fix the wiring so the hook fires again: re-run `pnpm install` (its `prepare:hooks` step re-registers the hooks path), verify `git config core.hooksPath` prints `.github/hooks`, confirm the next commit visibly shows the hook's lint-staged output, and mention the repair in your summary.
5. **If the repair itself fails, report it loudly** — state exactly what is broken and what you tried in your summary — instead of committing around it. A manual `pnpm lint-staged` run is an emergency stopgap for a single commit while the hook is being repaired, never an alternative workflow.

### Security review: run it on code changes

Security review is a standing step, not an on-request extra. Before pushing a change that touches **executable code or its config** — anything under `packages/**`, the docs site's `.ts`/`.astro`/config files, `.github/workflows/**`, or repo scripts — apply the [`security-review`](#task-specific-skills-agentsskills) skill to the diff, then fix any confirmed findings or report them in your summary (the skill reports only high-confidence, exploitable issues, so a finding is worth acting on). **Docs-prose-only changes are exempt** — editing `.md`/`.mdx` content under `docs/src/content/` doesn't need a security pass. Use judgement at the boundary: a change that adds a script, a dependency, a build hook, or a new runtime code path is in scope even if it's small.

Agent-specific notes:

- **Never expose private repositories.** This is a public repo: anything you write here is published. Never reference the owner's (or anyone's) private repositories — no repo names, URLs, or file paths — in code, docs, commit messages, PR titles/descriptions, issues, or review comments. If work is ported or adapted from a private source, describe it neutrally ("hand-maintained", "vendored") without naming or linking the source. This applies to every agent and every session, with no exceptions.
- **Never bump a package version.** See [Releases](./CONTRIBUTING.md#releases) in `CONTRIBUTING.md` — version bumps happen only on `main`, cut by the project owner, as their own commit. Don't add one to a feature/fix branch or PR, even if explicitly asked to "cut vX.Y.Z"; implement the change and let the owner handle the bump separately.
- **Keep PR titles and descriptions in sync with the branch.** A PR's title/body must describe the _current_ committed state, not the first push: whenever you push commits that materially change what the PR does or contains (new scope, new files, a follow-up like docs or a fix), update the title and description in the same session — reviewers and the squash-merge commit message read the description, so a stale one misleads both. Preserve the PR template's section structure when editing, re-check the "purpose" checkboxes if the change type shifted, and keep the description about the final diff (no changelog-style "edit: also added…" appendices). Trivial pushes that don't change the story (typo fixes, lint appeasement, addressing a review nit) don't require an edit.
- **Don't rewrite branch history for tidiness.** PRs are squash-merged, so a branch's individual commits never reach `main` and don't need to be clean — net-zero pairs, fixup commits, and revert commits are all fine to leave in place. Only rewrite history (rebase, force-push) when the user explicitly asks for it; don't propose it unprompted.
- This project uses `nvm` to manage Node.js versions, so prefix commands with
  `nvm use` where necessary. If you're Zed's agent you likely **won't** need
  to.
- **Formatting is part of the change, not a follow-up.** Before staging, run Prettier over the files you touched (`pnpm prettier --write <files>`) and stage the formatted result so it lands in the _same_ commit. Then confirm `git status` is clean. Never push a separate "prettier wrap"/formatting-only fixup commit to tidy up after yourself — that's noise, and it means the original commit was incomplete.
- **Never hard-wrap Markdown prose.** In Markdown (`.md` / `.mdx`) only, write each paragraph as one unbroken line and let the editor soft-wrap it — don't insert manual newlines to keep lines short. Prettier defaults to `proseWrap: "preserve"`, so it won't reflow Markdown prose for you, and any hard wraps get committed verbatim as noisy diffs. Everywhere else — code comments and commit bodies — do hard-wrap, keeping lines within Prettier's `printWidth` (`80`, set in [`.prettierrc.json`](./.prettierrc.json)).
- The `docs` site deploys via Cloudflare Workers Builds, and its build watch paths are configured in the Cloudflare dashboard UI (not `wrangler.jsonc`). See [Deployment](./docs/README.md#-deployment) in the docs README before changing how docs builds are scoped.
- To verify an `examples/` change in a real StackBlitz WebContainer before merging, open it from GitHub against your branch: `https://stackblitz.com/github/joe-bell/cva/tree/<branch>/<dir>`. Branch names containing slashes (e.g. `claude/my-feature`) resolve fine — StackBlitz parses them correctly against the trailing path, so no slash-free branch is needed.

## Learnings

Durable, hard-won lessons that don't fit a section above. See [Keeping this guide current](#keeping-this-guide-current-self-improving) for what belongs here and how to write it. Newest first; prune anything that's become wrong or obsolete.

- Both published packages (`packages/cva`, `packages/class-variance-authority`) build with [`tsdown`](https://tsdown.dev) — the full pipeline (publish transform, config feature reference, what each build-time gate checks) is documented in [CONTRIBUTING.md's Build & publish section](./CONTRIBUTING.md#build--publish-packages); read it before touching either build. The agent-critical gotchas: each `package.json`'s `exports`/`publishConfig.exports` blocks are **regenerated on every build** — never hand-edit them, change that package's `tsdown.config.mts` (or the shared `.config/tsdown.base.mts`) instead (exception: `class-variance-authority`'s hand-maintained `publishConfig.typesVersions`, which tsdown preserves but doesn't generate); a red build from the attw/publint/unused gates means the _publish shape_ broke, not the source (tsdown's pack step applies `publishConfig` — verified by breaking `dts` and watching the gates fail); and always `pnpm pack`, never `npm pack`, since only pnpm applies the `publishConfig` exports rewrite.
- `packages/cva`'s type-export rule is in [`CONTRIBUTING.md`'s Style Guide](./CONTRIBUTING.md#style-guide) — `packages/cva/src/index.test.ts`'s `describe("exported types", ...)` and `describe("CVAVariantShape", ...)` blocks pin the current set of portability exports (`CVAComponent`/`CVAComponentShape`/`CVAVariantShape`) via the `CVA.` namespace import, so losing one immediately fails `pnpm --filter cva check:tsc` — but that guard only catches losing an _existing_ export, not a _new_ internal type leaking into a public signature. To check for the latter after reshaping `cva`'s public API, verify manually against the packed artifact: `pnpm --filter cva build`, then `pnpm --filter cva pack --pack-destination <tmp>` (use `pnpm pack`, never `npm pack` — only pnpm applies the package's `publishConfig` exports rewrite), extract with `tar -xzf <tmp>/cva-*.tgz --strip-components=1 -C <tmp>/node_modules/cva` (the tarball has a top-level `package/` directory that needs stripping, or `cva` won't resolve), write a small consumer file re-exporting a component / `VariantProps<typeof x>` / `getSchema` result, and compile it with `tsc --strict --declaration --emitDeclarationOnly --module nodenext --moduleResolution nodenext` (the module flags matter — without them `tsc` resolves via the `types` field and never traverses the rewritten `exports` map that consumers actually hit).
- `pr-comment.yml` (`workflow_run`) can't be exercised from a PR — GitHub always runs a `workflow_run` workflow's file as it exists on the default branch, so changes to it are invisible to the triggering PR's own run. The risky parts — [`test/bench/scripts/compare.ts`](./test/bench/scripts/compare.ts)'s validation/rendering, [`.github/scripts/process-pr-comment.mjs`](./.github/scripts/process-pr-comment.mjs)'s artifact/PR binding, and [`.github/scripts/pr-comment.mjs`](./.github/scripts/pr-comment.mjs)'s section-splicing — are covered by their own test files instead; after merging a change to the workflow glue, verify end-to-end with a scratch PR from a fork (benchmark comment appears, stale-run skip works, no duplicate sticky comments).
- The benchmark job must not write an Actions summary for PRs: PR code runs earlier in the same runner and can influence later steps. The separate `workflow_run` comment job uses a fresh runner and trusted default-branch renderer; keep the job summary limited to trusted pushes to `main`.
- [`test/bench/scripts/baselines.ts`](./test/bench/scripts/baselines.ts) installs published baselines with `pnpm add --ignore-scripts` so npm lifecycle scripts in baseline packages cannot run in the untrusted CI job.
- Benchmark baselines must resolve npm dist-tags separately for each package: `cva` and `class-variance-authority` share a repository but have independent release lines, so a repository GitHub tag cannot identify both packages' baseline versions. `cva` keeps npm `latest` at `0.0.0` (so it doesn't overwrite stable) and only `beta` is a meaningful baseline; `class-variance-authority` publishes stable to `latest` and has no `beta` dist-tag — see `PACKAGE_BASELINES` in [`test/bench/scripts/baselines.ts`](./test/bench/scripts/baselines.ts).
- `pnpm-workspace.yaml`'s `overrides` pin `cva` and `class-variance-authority` to `workspace:*`, so installing a published npm version of either **inside** the workspace (even in a throwaway subfolder under the repo) silently resolves back to local source instead. [`test/bench/scripts/baselines.ts`](./test/bench/scripts/baselines.ts) installs benchmark baselines into a directory outside the repo entirely (e.g. `$RUNNER_TEMP`) for exactly this reason — don't "fix" a baseline install by moving it back under the repo.
- `pnpm install` can fail with `ERR_PNPM_MISSING_TIME` when resolving a newly added dependency — this repo sets `minimumReleaseAge` in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml), and pnpm's metadata cache sometimes races abbreviated vs full registry docs. Just re-run `pnpm install`; the retry succeeds off the now-cached full metadata. Don't "fix" it by setting `resolution-mode: highest` or removing `minimumReleaseAge` — that disables a deliberate supply-chain protection.
- `CLAUDE.md` is a symlink to this file (`AGENTS.md`) — one source of truth serves both the Claude Code and generic-agent conventions. Edit `AGENTS.md`; don't try to write through the `CLAUDE.md` symlink (tools that refuse symlinks will error), and don't split them into two diverging files.
