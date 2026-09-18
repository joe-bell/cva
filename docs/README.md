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

The homepage reads weekly npm totals from [`src/content/npm-weekly-downloads.json`](./src/content/npm-weekly-downloads.json). The `weekly / npm-downloads` workflow fetches and validates npm's latest seven-day totals each Monday, then opens or updates a pull request containing the snapshot. Documentation builds read only the checked-in file and never depend on npm's API.

## Markdown mirrors

Every rendered documentation page with a Markdown alternate link produces a matching `.md` asset at build time. The stable home page is [/index.md](https://cva.style/index.md), and the beta home page is [/beta/index.md](https://cva.style/beta/index.md). A client can also request Markdown for a documentation route with an `Accept: text/markdown` header that has a higher quality value than `text/html`.

The `.md` files exist only after `pnpm --filter docs build`. The View as Markdown link references those generated assets, so use `pnpm --filter docs preview` when checking them locally; Astro's development server does not serve the mirrors.

The Worker is intentionally small: it serves built assets and negotiates between HTML and generated Markdown. `run_worker_first` routes documentation requests through that Worker, while static asset paths bypass it. That means documentation page requests consume Worker invocations, including requests that ultimately return a static asset.

`starlight-llms-txt` builds the stable abridged bundle by excluding beta pages; the complete bundle contains both stable and beta pages. Its custom beta set is abridged. Use each page's Markdown alternate link rather than appending `.md` to a canonical URL: the two home-page mirror URLs are exceptions to that shorthand.

## Deployment

The checked-in [wrangler.jsonc](./wrangler.jsonc) is the source configuration. Astro writes the deployable configuration to `dist/client/wrangler.json`; the `workerConfig` build integration validates and completes that generated file after the adapter finishes. Do not edit the generated file by hand.

Cloudflare Workers Builds watch paths are trigger settings, not `wrangler.jsonc` fields. They can be managed through the Cloudflare Builds API or the dashboard under **Settings → Build → Build watch paths**, and they are repository-root-relative.

- `docs/*`
- `packages/cva/*`
- `packages/class-variance-authority/*`
- `.config/*`
- `.github/cloudflare/*`, `.github/repository-settings/*`, `.github/rulesets/*`
- `.github/scripts/verify-cloudflare-build.mjs`, `.github/workflows/ci.yml`, `.github/workflows/cloudflare-build.yml`
- `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.prettierrc.json`
- `.node-version`, `.nvmrc`

The desired path payload lives in [`.github/cloudflare/docs-watch-paths.json`](../.github/cloudflare/docs-watch-paths.json). It does not update Cloudflare by itself. Follow the owner-run [Cloudflare MCP sync checklist](../.github/cloudflare/README.md#sync-with-the-cloudflare-mcp) to discover, update, and verify both live triggers without storing Cloudflare credentials or identifiers in the repository. The configured paths must remain a superset of every docs-build input. Policy, gate, and configuration paths are included deliberately so their changes force a real Cloudflare build instead of reusing an older matching result. Complete that sync, the fork rollout preflight below, and the [default-branch administration checks](../.github/rulesets/README.md#owner-migration) before making the `cloudflare/gate` GitHub check required.

Cloudflare `*` matches across `/`, so `docs/*` includes nested documentation files. Excludes are evaluated before includes. Cloudflare [bypasses path matching for empty and large pushes](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/), so the GitHub gate uses a stricter merge-base watched-tree comparison rather than claiming to reproduce every push-event decision.

The `cloudflare/gate` job is an operational check, not a trusted-workflow boundary. It has read-only permissions and no dependency installation, but an ordinary pull request can modify its workflow, script, or watched-path policy. Review those files carefully and do not change it to `pull_request_target`.

The workflow accepts a successful `Workers Builds: cva` check only from the expected Cloudflare GitHub App and only when its watched tree matches the current PR head. If Cloudflare has not reported a result before the bounded deadline, rerun the job after the build finishes.

For a representative contributor-fork PR, rollout accepts either of two outcomes:

- Cloudflare emits the expected `Workers Builds: cva` check and the read-only GitHub Actions job can read it after any required fork-workflow approval.
- Cloudflare does not post that check for the fork head. The gate then fails closed: a watched fork PR cannot satisfy the required `cloudflare/gate` context or auto-merge, so the owner must explicitly accept manual ruleset bypass after review.

Do not make the gate required until the owner has verified and accepted one of these outcomes.
