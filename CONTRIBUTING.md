# Contributing

Welcome, and thanks for your interest in contributing! Please take a moment to review the following:

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
5. Voilà, you're ready to go!

### Scripts

Run these from the repo root:

- `pnpm dev` – runs vitest, watching for file changes
- `pnpm test` – runs the test suite with coverage
- `pnpm build` – production build of the packages
- `pnpm check` – type checks every package
- `pnpm bundlesize` – verifies bundle size limits (`size-limit`)
- `pnpm prettier --check .` – checks formatting (`--write` to fix)
- `pnpm syncpack:lint` – checks dependency-version consistency (`pnpm syncpack:fix` to fix)

To scope a command to a single package, use a pnpm filter, e.g. `pnpm --filter cva test`.

CI runs `build`, `bundlesize`, `check`, `prettier`, `syncpack`, and `test`, so
run the matching scripts locally before opening a PR.

## Releases

A trade-off with using a personal repo is that permissions are fairly locked-down. In the mean-time releases will be made manually by the project owner.
