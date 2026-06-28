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

Deployed via [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). Builds are scoped with [build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/) set in the Cloudflare dashboard (**Settings → Build → Build watch paths**); there's no `wrangler.jsonc` equivalent. Paths are repo-root-relative, independent of the worker's `docs/` root.

Include paths (excludes are empty):

- `docs/*`
- `packages/cva/*`
- `.config/*`
- `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.prettierrc.json`
- `.nvmrc` — Node version; the one extensionless file we watch

`*` matches across `/`, so `docs/*` covers nested files. Root `.md` files and other extensionless files (`LICENSE`, `.gitignore`) are excluded, so prose-only changes don't redeploy.

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
