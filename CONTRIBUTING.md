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
3. Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) on your machine.
4. In the repo, install dependencies via:
   ```sh
   npm i
   ```
5. Voilà, you're ready to go!

### Scripts

- `npm run dev` – runs jest, watching for file changes
- `npm run build` – production build
- `npm run check` – type checks
- `npm run test`

## Releases

A trade-off with using a personal repo is that permissions are fairly locked-down. In the mean-time releases will be made manually by the project owner.
