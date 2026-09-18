# Cloudflare Workers Builds configuration

[`docs-watch-paths.json`](./docs-watch-paths.json) is the source of truth for the `cva` Workers Builds path filters. It does not update Cloudflare by being merged. Its `include` and `exclude` arrays map to the Builds API's `path_includes` and `path_excludes` fields.

## Sync with the Cloudflare MCP

This is an owner-run mutation. An agent may perform the discovery and comparison requests read-only, but it must receive explicit owner approval before calling the Cloudflare MCP `execute` tool with `PATCH`.

1. Use the Cloudflare MCP `search` tool to confirm the current schemas for `GET /accounts/{account_id}/workers/scripts`, `GET /accounts/{account_id}/builds/workers/{external_script_id}/triggers`, and `PATCH /accounts/{account_id}/builds/triggers/{trigger_uuid}`.
2. Use the `execute` tool with `GET /accounts/${accountId}/workers/scripts`, select the Worker whose `id` is `cva`, and retain its generated `tag` as the Builds API `external_script_id`. Do not assume the Worker name is accepted in place of this tag.
3. Use `GET /accounts/${accountId}/builds/workers/{external_script_id}/triggers`, filter the results to the GitHub repository `joe-bell/cva`, and inspect every returned trigger before changing anything. Expect one default-branch trigger that includes `main` and one non-production trigger that includes `*` while excluding `main`; stop if the live trigger set is different.
4. Read `docs-watch-paths.json`. Map `include` to `path_includes` and `exclude` to `path_excludes` without changing order or wildcard syntax.
5. After explicit owner approval, use the `execute` tool to `PATCH` each discovered trigger UUID with only `path_includes` and `path_excludes`. Omitting the other trigger fields avoids overwriting build commands, branch filters, caching, tokens, or root-directory settings.
6. Repeat the trigger `GET` and verify both live triggers match the committed arrays exactly. Do not publish the GitHub ruleset until this comparison passes.

The dashboard under **Settings → Build → Build watch paths** remains the fallback when the Cloudflare MCP is unavailable. The authenticated MCP connection must have `Workers CI Write`; keep its account ID, discovered trigger UUIDs, and API token out of this repository. See Cloudflare's [Update a build trigger](https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/update/) reference.

## Remove this compatibility layer when native configuration catches up

Wrangler does not currently expose Workers Builds trigger watch paths in `wrangler.jsonc`; its `build.watch_dir` setting controls local custom-build watching instead. When Workers Builds can consume `path_includes` and `path_excludes` from the checked-in Wrangler configuration, migrate the desired state there and remove this JSON and MCP sync workflow. Keep `cloudflare/gate` until skipped builds produce a stable required check or GitHub can require the Cloudflare check conditionally. Once both conditions are met, remove the gate workflow, script/tests, ruleset context, and related guidance together.
