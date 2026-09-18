# Default-branch administration

These files are reviewable request bodies and desired Cloudflare state. They do not change GitHub or Cloudflare by being merged.

`default-branch.json` is an active branch-ruleset request body. It requires `benchmark`, `build`, `bundlesize`, `check`, `cloudflare/gate`, `prettier`, `syncpack`, and `test`, all from the GitHub Actions app (`15368`). `skills` is not required. `cloudflare/gate` is the read-only gate job, not Cloudflare's external `Workers Builds: cva` check. The gate validates that external check by its exact name, Cloudflare app ID (`85455`), and app slug (`cloudflare-workers-and-pages`).

The ruleset allows squash merges only, requires linear history, and prevents deletion and force-pushes. It asks for zero approvals so auto-merge can wait for checks rather than an approval. Joe's `pull_request` bypass (`7349341`) applies to every rule in this ruleset: a manual administrator merge can bypass all of them. It is not a review-only exemption, and it does not guarantee that auto-merge can bypass another active rule or classic protection.

Only people with write permission can enable auto-merge. GitHub [disables auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) if someone without write permission pushes another commit to the head branch or changes the base branch.

The artifact sets `strict_required_status_checks_policy` to `false`. It does not preserve unknown classic-protection details such as stale-review dismissal, code-owner review, last-push approval, conversation resolution, admin enforcement, or signature rules. The owner must inspect and decide those settings before publishing.

## Owner migration

Run these from the repository root after reviewing the merged artifacts. The commands below mutate settings only where marked, and are for the repository owner to run, not CI or an agent.

1. Snapshot the current GitHub state before changing anything.

   ```sh
   mkdir -p /tmp/cva-jb-410
   gh api --method GET -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva > /tmp/cva-jb-410/repository.json
   gh api --method GET -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva/branches/main/protection > /tmp/cva-jb-410/classic-protection.json
   gh api --paginate --slurp -H 'X-GitHub-Api-Version: 2026-03-10' 'repos/joe-bell/cva/rulesets?per_page=100' > /tmp/cva-jb-410/ruleset-pages.json
   jq 'add' /tmp/cva-jb-410/ruleset-pages.json > /tmp/cva-jb-410/rulesets.json
   ```

   Compare the snapshots with the request body and revise the body if the existing protection has requirements this artifact does not yet represent. Keep the snapshots for rollback. Do not retire classic protection first.

2. Align both Workers Builds triggers with `.github/cloudflare/docs-watch-paths.json` by following the owner-run [Cloudflare MCP sync checklist](../cloudflare/README.md#sync-with-the-cloudflare-mcp). The file is desired state only, not a Cloudflare API request. The checklist discovers the live trigger UUIDs, maps `include` and `exclude` to Cloudflare's API fields, patches only after explicit owner approval, and verifies both triggers afterward. Cloudflare `*` matches across `/`, evaluates excludes before includes, and [bypasses path matching for empty and large pushes](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/).

3. Prove the live integration on an in-repository PR before requiring the gate. Test a watched docs change, a `packages/**` change, and an unrelated un-watched change. A watched change must produce `Workers Builds: cva` from the expected Cloudflare app and a successful `cloudflare/gate` job. The un-watched change should let the gate pass from the equal watched-tree comparison. A package change must also run the benchmark work; an un-watched PR still receives a successful, inexpensive `benchmark` context.

4. Test a representative contributor-fork PR and accept one of these outcomes before publishing the ruleset:
   - Cloudflare emits the expected `Workers Builds: cva` check and the read-only GitHub Actions job can read it after any required fork-workflow approval.
   - Cloudflare does not post that check for the fork head. The gate then fails closed: a watched fork PR cannot satisfy the required `cloudflare/gate` context or auto-merge, so the owner must explicitly accept manual ruleset bypass after review.

   The required `cloudflare/gate` context remains in place in either case. If neither behavior is acceptable or reliable, fix the Cloudflare or fork configuration before rollout; the gate never silently passes a missing fork build.

5. Enable auto-merge after the checks above are proven. This command mutates repository settings.

   ```sh
   gh api --method PATCH -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva --input .github/repository-settings/auto-merge.json
   ```

6. Publish the active ruleset only after the Cloudflare paths and fork behavior are verified. This command mutates repository rules.

   ```sh
   gh api --method POST -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva/rulesets --input .github/rulesets/default-branch.json > /tmp/cva-jb-410/new-ruleset.json
   gh api --method GET -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva/rules/branches/main > /tmp/cva-jb-410/effective-rules.json
   ```

   Inspect the effective rules and a fresh PR's check sources. Only then retire the specific classic branch protection that the saved snapshot covers. The owner must perform that final deletion as a separate action.

   If rollback is needed, only the repository owner may delete the newly created ruleset. This mutates GitHub; do not run it here, from CI, or from an agent.

   ```sh
   RULESET_ID="$(jq -r '.id' /tmp/cva-jb-410/new-ruleset.json)"
   gh api --method DELETE -H 'X-GitHub-Api-Version: 2026-03-10' "repos/joe-bell/cva/rulesets/$RULESET_ID"
   ```

   Keep classic protection in place and restore the saved state through the GitHub settings UI before trying again.

## Gate trust boundary

`cloudflare-build.yml` uses ordinary `pull_request`, read-only permissions, a SHA-pinned full-history checkout, and no dependency installation. It is an operational gate, not a tamper-resistant boundary: a contributor can change the workflow or script in the same PR. Matching the GitHub Actions app authenticates the check producer, not the PR-controlled workflow content. Review `.github/workflows/cloudflare-build.yml` and `.github/scripts/verify-cloudflare-build.ts` as security-sensitive files. Do not replace this with `pull_request_target`.

The gate reads the watch-path file from both immutable Git revisions and treats a path as watched when either the merge-base policy or the PR-head policy watches it. This prevents a PR from hiding its changes by narrowing the policy. It then compares the complete watched Git trees, including path names, deletions, modes, and symlink targets. Check reuse is bounded to the head and the oldest matching ancestor within a 100-commit ancestry walk; longer histories disable ancestor reuse and check only the current head. Each lookup accepts at most one API page so the request budget always reserves every poll attempt. A successful ancestor check proves only the matching watched head inputs, not the synthetic merge result. If polling times out, rerun the job after Cloudflare reports the build.

## Dependabot and repository security

Keep the existing GitHub Actions updater in `.github/dependabot.yml`. npm updates are deferred because GitHub's documented Dependabot support stops at pnpm 10, while this workspace pins pnpm `11.0.9`. Do not downgrade pnpm or rewrite the lockfile to fit Dependabot. Reassess upstream support before adding an npm updater.

The owner must verify repository security settings separately because this task does not change them. Check that the dependency graph ingests the pnpm lockfile, Dependabot alerts and security updates are enabled, alert notification delivery reaches the intended account, and an alert for transitive `postcss` would be visible and actionable. These read-only checks provide useful evidence where access permits:

```sh
gh api --method GET -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva/dependency-graph/sbom/generate-report > /tmp/cva-jb-410/sbom-request.json
SBOM_ENDPOINT="$(jq -er '.sbom_url | sub("^https://api[.]github[.]com/"; "")' /tmp/cva-jb-410/sbom-request.json)"
gh api --method GET -H 'X-GitHub-Api-Version: 2026-03-10' "$SBOM_ENDPOINT" > /tmp/cva-jb-410/sbom.json
gh api --paginate --slurp -H 'X-GitHub-Api-Version: 2026-03-10' 'repos/joe-bell/cva/dependabot/alerts?state=open&per_page=100' > /tmp/cva-jb-410/dependabot-alert-pages.json
jq 'add' /tmp/cva-jb-410/dependabot-alert-pages.json > /tmp/cva-jb-410/dependabot-alerts.json
gh api --include --method GET -H 'X-GitHub-Api-Version: 2026-03-10' repos/joe-bell/cva/automated-security-fixes
jq '.[] | select(.dependency.package.name == "postcss")' /tmp/cva-jb-410/dependabot-alerts.json
```

The [asynchronous SBOM API](https://docs.github.com/en/rest/dependency-graph/sboms) returns immediately after requesting generation. If the fetch command writes an empty file because GitHub responds with `202 Accepted`, wait briefly and rerun only that fetch command; a ready report redirects to the generated SPDX JSON download.

Verify notification delivery in GitHub's notification settings as well; repository APIs do not prove an email or web notification reached its recipient.
