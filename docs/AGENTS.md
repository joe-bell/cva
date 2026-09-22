# AGENTS.md

## Docs site learnings

Applies when working under `docs`. See also [Docs styling](../AGENTS.md#docs-styling) and [Docs writing](../AGENTS.md#docs-writing) in the root guide.

These are the same durable learnings the root [`AGENTS.md`](../AGENTS.md) records, scoped here so they load only when relevant. Keep them current the same way — see [Keeping this guide current](../AGENTS.md#keeping-this-guide-current-self-improving).

- Inside `.sl-markdown-content`, Starlight's sibling selector adds top margin to block children after non-inline siblings. Components using grid/flex `gap-*` must zero affected child margins so the margin does not stack with the gap; see [`docs/src/components/stackblitz.astro`](../docs/src/components/stackblitz.astro).

- `starlight-llms-txt` turns titled iframes into links in `llms-full.txt`, `llms-small.txt`, and custom-set outputs. Keep `customSelectors.all` in [`docs/astro.config.ts`](../docs/astro.config.ts) paired with iframe removal in [`docs/src/lib/html-to-markdown.ts`](../docs/src/lib/html-to-markdown.ts) so these outputs and Markdown mirrors omit embeds.

- The static docs build's Cloudflare adapter writes an asset-only `dist/client/wrangler.json`. The `workerConfig` `astro:build:done` hook restores the checked-in Worker entry point and `ASSETS` binding after validating the generated configuration; keep `session: false` so the adapter does not inject an invalid `SESSION` KV binding. Use `pnpm --filter docs preview`, which runs `wrangler dev`, to test that deployment shape rather than `astro preview`.

- Keep `satteri@0.10.5` as a direct docs development dependency and externalize it only in Astro's Node prerender environment. Its native binding must resolve beside that package while rendering; it must not enter the deployed Worker bundle. Preserve existing `resolve.external` values when configuring it, and update the pin when `@astrojs/markdown-satteri` changes its supported range.

- `docs/src/integrations/**` is exercised by `pnpm --filter docs build`, not the unit-test coverage set. Static HTML is the integration contract because it supplies the page metadata and rendered content used for Markdown mirrors.

- [Cloudflare cache variation](https://developers.cloudflare.com/cache/concepts/vary/) requires configured `Accept` variants for HTML Cache Rules. If such a rule is added, configure and normalize `Vary: Accept`, or the negotiated Markdown variant can reach an HTML client.
