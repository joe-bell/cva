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

- `pnpm dev` – runs jest, watching for file changes
- `pnpm build` – production build
- `pnpm tsc` – type checks
- `pnpm test`

## Releases

A trade-off with using a personal repo is that permissions are fairly locked-down. In the mean-time releases will be made manually by the project owner.
