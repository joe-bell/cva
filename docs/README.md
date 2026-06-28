# Starlight Starter Kit: Tailwind

```
npm create astro@latest -- --template starlight/tailwind
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/starlight/tree/main/examples/tailwind)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/starlight/tree/main/examples/tailwind)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   │   └── config.ts
│   └── env.d.ts
├── astro.config.mjs
├── package.json
├── tailwind.config.cjs
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:3000`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🚀 Deployment

This site deploys via [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), which rebuilds on every push to the connected repo. Because this is a monorepo, builds are scoped with [build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/) so unrelated changes don't redeploy the site. These paths are **configured in the Cloudflare dashboard UI** (Settings → Build → Build watch paths), as per the Cloudflare docs — there is no Wrangler config field for them, so they do **not** live in [`wrangler.jsonc`](./wrangler.jsonc). Paths are matched against full, repo-root-relative paths from the push event, independent of the worker's `docs/` root directory.

Current **include paths** (exclude paths are empty):

- `docs/*` — the site source
- `packages/cva/*` — the only workspace package the docs depend on
- `.config/*` — shared tooling config
- `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.prettierrc.json` — root files that match the include rule (have an extension, aren't `.md`)
- `.nvmrc` — a deliberate exception to the "skip extensionless root files" rule, since the build reads it for the Node version

A `*` matches across `/`, so a trailing-`*` entry like `docs/*` also covers nested files. Root `.md` files (e.g. `README.md`) and the other extensionless root files (e.g. `LICENSE`, `.gitignore`) are intentionally omitted so prose-only changes don't trigger a deploy. Cloudflare also force-builds regardless of these paths when a push has 0 changes, 3000+ changed files, or 20+ commits.

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
