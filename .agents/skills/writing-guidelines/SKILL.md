---
name: writing-guidelines
description: Review or write docs/prose for Writing Guidelines compliance. Use when asked to "review my docs", "check writing style", "audit prose", "review docs voice and tone", "check this page against the writing handbook" — and proactively whenever writing or editing content under docs/src/content/docs/, since that's this repo's default docs style.
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Writing Guidelines

Review or write files for compliance with Writing Guidelines: the upstream Vercel ruleset, plus this repo's house style additions below. The house style section is local to this repo and is not overwritten by `npx skills update` (see [Task-specific skills](/AGENTS.md#task-specific-skills-agentsskills) for the update/re-tweak workflow) — re-apply it if a future update clobbers it.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines, plus the [cva house style](#cva-house-style) below
4. Output findings in the terse `file:line` format (review mode) or apply the rules directly (writing mode)

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions. If the fetch fails (no network access), fall back to the [cva house style](#cva-house-style) below — it's self-contained and doesn't require the fetch.

## Usage

**Reviewing** (a user provides a file or pattern argument, or asks for a docs/prose review):

1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines, then the house style rules below (house style wins on conflict)
4. Output findings using the fetched guidelines' format

If no files are specified, ask the user which files to review.

**Writing** (creating or editing content under `docs/src/content/docs/`): apply both rule sets as you write, don't wait to be asked for a review pass afterwards.

## cva house style

These extend or override the fetched guidelines for this repo specifically. They come from lessons learned auditing and rewriting the full docs corpus — see git history on `docs/src/content/docs/**` for the source pass.

- **Voice**: sentence-case headings, active voice, front-loaded intros, no filler words ("just"/"simply"/"really" as minimizers), lists introduced with a colon — same as upstream. **Exception**: the FAQs and What's New pages carry a deliberate personal, informal author voice (asides, mild profanity, jokes). Don't flatten it to neutral documentation tone; only fix mechanics (headings, dashes, factual errors) around it. If genuinely unsure whether a line is voice vs. sloppiness, ask rather than rewrite.
- **Spelling**: US English throughout (favor, behavior, while — not favour, behaviour, whilst).
- **Punctuation**: no em dash (—) or en dash (–) as punctuation anywhere in prose or list items — rephrase with a colon, comma, period, or parentheses instead (the fetched guidelines already say this; it's called out here because it's the single most common violation in this repo's history). Straight quotes (`'`/`"`) in source are fine and expected — don't "fix" them to curly quotes. Astro's `markdown.smartypants` already renders them curly in the built HTML; a source-level change would be redundant.
- **Frontmatter**: every page requires a one-line, front-loaded `description:` (Starlight's schema enforces this at build time — see `docs/src/content.config.ts`). No page may omit it.
- **Code examples with `// =>` output comments**: never hand-write or hand-derive the output string. Build the relevant package (`pnpm --filter cva build` or `pnpm --filter class-variance-authority build`) and execute the example verbatim against the built `dist/index.mjs` (a throwaway Node script in the scratchpad works well) to get the real string, then paste it in verbatim. Stale/wrong output comments are the highest-value bug class found in this repo's docs to date — don't reintroduce them.
- **Beta vs. stable**: `docs/src/content/docs/beta/**` is a `starlight-versions` snapshot of the beta docs, not a live mirror — editing a stable page never updates its beta counterpart or vice versa. Every fix that applies to both needs two explicit edits. Stable pages import `cva` from `"class-variance-authority"` and call it with the two-argument form (`cva(base, options)`); beta pages import from `"cva"` and use the single-object form (`cva({ base, ...options })`) — don't mix them up when writing or copying examples between the two trees.
- **Navigation vs. in-page casing**: sidebar/nav labels (`docs/astro.config.ts`, `docs/src/content/versions/beta.json`) stay Title Case as navigation proper nouns; in-page `##`/`###` headings use sentence case. Proper nouns (Tailwind CSS, TypeScript, React, BEM, 11ty, YouTube) keep their normal casing in either context.
- **Markdown source formatting**: never hard-wrap prose — one line per paragraph in the source, let the editor soft-wrap (see the repo-wide rule in [AGENTS.md](/AGENTS.md)).
