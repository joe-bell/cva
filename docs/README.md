# Documentation

The [cva.style](https://cva.style/) documentation site serves the stable package at `/` and the current beta at [/beta/](https://cva.style/beta/). It is built with [Astro Starlight](https://starlight.astro.build/) and deployed through [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

## Commands

Run these from the repository root.

| Command                                             | Purpose                                                                                                                        |
| :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter docs dev`                            | Start Astro's authoring server. It does not run the production Worker request negotiation.                                     |
| `pnpm --filter docs build`                          | Type-check and build the static site, Markdown mirrors, and generated Wrangler deployment configuration.                       |
| `pnpm --filter docs preview`                        | Build, then run `wrangler dev` against the generated Worker and assets. Use this to check production request handling locally. |
| `pnpm --filter docs exec wrangler deploy --dry-run` | Validate the generated Worker deployment bundle without deploying it.                                                          |

`astro preview` is not a production-equivalent preview for this site. The static build's generated Wrangler configuration restores the Worker entry point and the `ASSETS` binding after the Cloudflare adapter writes its asset configuration, so use the `preview` command above when testing deployment behavior.

Docs `prebuild` runs [`src/scripts/generate-bundle-sizes.ts`](./src/scripts/generate-bundle-sizes.ts) before `build`. Docs `dev` and `start` call it before Wrangler and Astro. Docs `preview` runs `build`, which runs `prebuild`.

The generator removes stale `docs/.generated/bundle-sizes.json`. It runs each package's Size Limit CLI from its package directory against existing `dist` files. It validates stable `dist/index.js` and beta `dist/index.cjs`, then atomically writes `docs/.generated/bundle-sizes.json`.

The generator does not compile packages. Root install/prepare provides `dist`. After editing package source, run `pnpm build` or `pnpm --filter <package> build` before direct docs measurement.

Astro runs the homepage's weekly npm download loader during each content sync. `pnpm --filter docs build` syncs once for `astro check` and again for `astro build`, so it requests npm's bulk download API twice. Each request is bounded to 10 seconds; a failed, malformed, or timed-out response clears the collection and stops the command instead of reusing stale totals.

## Markdown mirrors

Every rendered documentation page with a Markdown alternate link produces a matching `.md` asset at build time. The stable home page is [/index.md](https://cva.style/index.md), and the beta home page is [/beta/index.md](https://cva.style/beta/index.md). A client can also request Markdown for a documentation route with an `Accept: text/markdown` header that has a higher quality value than `text/html`.

The `.md` files exist only after `pnpm --filter docs build`. The View as Markdown link references those generated assets, so use `pnpm --filter docs preview` when checking them locally; Astro's development server does not serve the mirrors.

The Worker is intentionally small: it serves built assets and negotiates between HTML and generated Markdown. `run_worker_first` routes documentation requests through that Worker, while static asset paths bypass it. That means documentation page requests consume Worker invocations, including requests that ultimately return a static asset.

`starlight-llms-txt` builds the stable abridged bundle by excluding beta pages; the complete bundle contains both stable and beta pages. Its custom beta set is abridged. Use each page's Markdown alternate link rather than appending `.md` to a canonical URL: the two home-page mirror URLs are exceptions to that shorthand.

## Deployment

The checked-in [wrangler.jsonc](./wrangler.jsonc) is the source configuration. Astro writes the deployable configuration to `dist/client/wrangler.json`; the `workerConfig` build integration validates and completes that generated file after the adapter finishes. Do not edit the generated file by hand.

Cloudflare Workers Builds watch paths are configured in the Cloudflare dashboard under **Settings → Build → Build watch paths**, not in `wrangler.jsonc`. They are repository-root-relative.

- `docs/*`
- `packages/cva/*`
- `.config/*`
- `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.prettierrc.json`
- `.nvmrc`

The dashboard does not yet watch `packages/class-variance-authority/*`. Add that path manually before relying on stable package changes to trigger a documentation build; this repository cannot update Cloudflare dashboard watch paths.

`*` matches across `/`, so `docs/*` includes nested documentation files. Root Markdown files and other extensionless root files do not match these paths.
