# AGENTS.md

## CI, Cloudflare gate, and workflow learnings

Applies when working under `.github` — workflows, the Cloudflare watch-path policy, and the required checks they produce.

These are the same durable learnings the root [`AGENTS.md`](../AGENTS.md) records, scoped here so they load only when relevant. Keep them current the same way — see [Keeping this guide current](../AGENTS.md#keeping-this-guide-current-self-improving).

- `cloudflare / gate` passes without Cloudflare only when the PR head watched Git tree matches its merge base. When that watched tree has changed, same-repository PRs require a successful `Workers Builds: cva` check on the current head or an ancestor with the identical watched tree. Ancestor reuse scans at most 100 commits; longer histories check only the current head. Cloudflare does not report Workers Builds checks for watched cross-repository PRs, so the gate fails those immediately and requires an owner review plus ruleset bypass. An absent, pending, malformed, or failed result blocks until a rerun. It does not prove a synthetic merge result and remains an ordinary PR-controlled workflow, so review its workflow, script, and desired watch-path JSON as security-sensitive and never switch it to `pull_request_target`.

- The required `benchmark` context must always exist, even when benchmark work is skipped. In `ci.yml`, use the PR base-to-head three-dot range so base-only package changes do not run benchmarks, the push before-to-after two-dot range with the all-zero initial-base fallback, and fail closed on an unexpected event or unavailable range; condition only dependency installation, baselines, benchmarking, the push-only summary, and PR artifact on that output.

- The weekly npm downloads workflow reuses `automation/weekly-npm-downloads`; merge `origin/main` into that branch before committing a new snapshot so an open automation PR does not drift behind `main`.

- Cloudflare Workers Builds watch paths are represented by [`.github/cloudflare/docs-watch-paths.json`](../.github/cloudflare/docs-watch-paths.json). Keep the desired list a superset of every docs-build input, including both packages, `.node-version`, `.nvmrc`, and the existing docs/build inputs. Include the gate and configuration policy paths so a policy change forces a real Cloudflare build; the gate uses the union of the immutable merge-base and head policies so a PR cannot hide changes by narrowing its own list. Cloudflare `*` spans `/`, and the owner must sync and verify both live triggers through the documented MCP checklist or dashboard.

- `pr.yml` keeps its privileged comment job on `workflow_run`, so GitHub always runs that job from the default branch. Its separate `pull_request` smoke job has read-only permissions and a fake GitHub client; it exercises the PR version's artifact round trip, TypeScript import, binding, and rendering without making API calls. Keep the smoke job free of write permissions and secrets. Its success does not prove production token delivery, so observe the first natural post-merge benchmark comment after changing the privileged job.

- The benchmark job must not write an Actions summary for PRs: PR code runs earlier in the same runner and can influence later steps. The separate `workflow_run` comment job uses a fresh runner and trusted default-branch renderer; keep the job summary limited to trusted pushes to `main`.
