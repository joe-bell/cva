---
name: cva-migrate
description: Migrate a project between cva versions, routing to a curated per-release guide when one exists and researching the release history when it does not. Use when changing the cva version in a project, when a build breaks after a cva upgrade with errors about missing exports such as compose, hooks, defineConfig or getSchema, or when asked to move cva imports onto a newer entry point.
metadata:
  source: hand-maintained for the joe-bell/cva repository
---

# Migrate a `cva` project between versions

This skill is a router. It works out which migration a project actually needs, then loads the one curated guide for that route if there is one. Today exactly one route is curated, a `cva` beta upgrade; every other route, including any downgrade, is researched from the release history in Step 3 rather than served from a guide. Do not read every reference: each one is a detailed release-specific guide, and loading guides the project does not need wastes context and invites advice that does not apply.

`cva@beta` is not covered by semver and changes without warning. Treat every route below as version-to-version migration guidance, not a semver contract.

## Step 1: identify the route

A route is the pair (installed version, destination version).

**Destination.** Use the version the user asked for. If they did not name one, ask, or take the destination from whichever release they are reacting to. Do not assume "latest": `cva` parks the npm `latest` dist-tag at `0.0.0` and publishes prereleases under `beta`.

**Installed version.** Read what is actually resolved in the project, not the range in `package.json`. Ask the project's package manager, adding its workspace selector in a monorepo:

```sh
npm ls cva                # npm: installed tree
pnpm why cva              # pnpm: installed list, with the dependents
yarn why cva              # Yarn: installed resolution (Classic and Berry)
bun pm ls | grep cva      # Bun: installed tree
```

Do not read the version with `node -p "require('cva/package.json').version"`. `cva` only added `"./package.json"` to its `exports` in `1.0.0-beta.7`, so on earlier versions that command fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Yarn Classic's `yarn info cva` queries the registry rather than the project, so it reports the newest published version instead of the installed one; `yarn why` answers correctly for both Classic and Berry.

If the output is ambiguous, read the project's lockfile and find the resolved `cva` entry. Reach for the lockfile, never for registry metadata: the registry cannot tell you what this project installed.

## Step 2: load the curated guide for that route

| From                                           | To                  | Guide                                                                          |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `cva@1.0.0-beta.0` through `cva@1.0.0-beta.10` | `cva@1.0.0-beta.11` | [`references/beta/cva-1.0.0-beta.11.md`](references/beta/cva-1.0.0-beta.11.md) |

A row matches only when **both** sides match: the version you found in Step 1 falls inside that row's `From` range **and** your destination equals its `To`. A destination match alone is not enough. Migrating `cva@0.0.0` (the published placeholder on the `latest` dist-tag) to `cva@1.0.0-beta.11` does not match the row above, because that source is not inside `beta.0` through `beta.10`.

If a row matches on both sides, read that guide and only that one. Its `From` column is the range of installed versions it covers, and the guide routes internally from there: it tells you which of its sections apply to the specific version you found in Step 1. Everything you need for that route is in it, so read it in full before editing, then stop.

If no row matches on both sides, go to Step 3.

## Step 3: an uncurated route

If no row above matches on both sides, the route is not curated yet. That includes a destination with no row at all, a source outside a matching row's `From` range, and every downgrade. Research it yourself. Do not ask the user to tell you what changed in a release, and do not guess from the version number.

Gather evidence in this order:

1. The [GitHub Releases page](https://github.com/joe-bell/cva/releases) for `joe-bell/cva`, reading **every** release tagged between the installed version and the destination, not just the destination's own notes. A breaking change may have landed in an intermediate release.
2. The tagged source and package metadata for those releases: `package.json` `exports`, `peerDependencies` and `dependencies`, plus the published type declarations. Compare the installed version's tag against the destination's.
3. The published npm artifacts when a tag is missing or thin. Some early prereleases were published to npm with no GitHub release at all; `1.0.0-beta.0` and `1.0.0-beta.1` are the known cases. Those releases have no notes, so do not write notes for them, and do not present a tarball diff as if it were an announcement.
4. The consumer's own installed tree and lockfile, to know which of the changes you found actually affect this project.

Then apply only the changes that evidence supports. If the evidence is insufficient (a release you cannot reach, a gap you cannot explain, a behavior change you cannot confirm from source or artifacts), **stop and say so**, naming what is missing. An unverified migration step is worse than an unfinished one.

Two packages share this repository and release independently. `cva` is the beta line; `class-variance-authority` is the stable `0.x` package in maintenance mode, with its own tags and its own `latest` dist-tag. Do not read one package's releases as evidence about the other. Moving from `class-variance-authority@0.x` to `cva@1.0` is a different job with its own documentation: send the user to [What's New](https://cva.style/beta/getting-started/whats-new/).

## Curating a new route

Curate a route **before** its release is tagged and cut, in the same change as the work that needs it. Add the guide under `references/`, add its row to the table above, and land both with the implementation, so the tag already carries guidance that matches the code. Prerelease guides live in `references/beta/cva-<version>.md`; `references/` itself is reserved for stable-version guides. A release that ships first and documents later leaves every upgrader on the uncurated path.

Keep every earlier `From` version the new guide still serves: a project on an old prerelease is still a project the next release has to migrate. Only remove a row when it is wrong, never because a newer version exists.
