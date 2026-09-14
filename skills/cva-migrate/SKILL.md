---
name: cva-migrate
description: Migrate a project between cva versions, routing to a curated per-release guide when one exists and researching the release history when it does not. Use when changing the cva version in a project, when a build breaks after a cva upgrade with errors about missing exports such as compose, hooks, defineConfig or getSchema, or when asked to move cva imports onto a newer entry point.
metadata:
  source: hand-maintained for the joe-bell/cva repository
---

# Migrate a `cva` project between versions

This skill is a router. It identifies the source and destination versions, then loads at most one curated guide. Today only the `cva@1.0.0-beta.11` route is curated. Research every other route, including downgrades, in Step 3. Never load unrelated references because their instructions may not apply.

`cva@beta` is not covered by semver and changes without warning. Treat every route below as version-to-version migration guidance, not a semver contract.

## Step 1: identify the route

A route pairs the installed version with the destination version.

**Destination.** Use the version the user asked for. If they did not name one, ask, or take the destination from whichever release they are reacting to. Do not assume "latest": `cva` parks the npm `latest` dist-tag at `0.0.0` and publishes prereleases under `beta`.

**Installed version.** Read what is actually resolved in the project, not the range in `package.json`. Ask the project's package manager, adding its workspace selector in a monorepo:

```sh
npm ls cva                # npm: installed tree
pnpm why cva              # pnpm: installed list, with the dependents
yarn why cva              # Yarn: installed resolution (Classic and Berry)
bun pm ls | grep cva      # Bun: installed tree
```

Do not read the version with `node -p "require('cva/package.json').version"`. `cva` only added `"./package.json"` to its `exports` in `1.0.0-beta.7`, so on earlier versions that command fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Yarn Classic's `yarn info cva` queries the registry rather than the project, so it reports the newest published version instead of the installed one; `yarn why` answers correctly for both Classic and Berry.

If the output is ambiguous, find the resolved `cva` entry in the project's lockfile. Registry metadata cannot tell you what this project installed.

## Step 2: load the curated guide for that route

| From                                           | To                  | Guide                                                                          |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `cva@1.0.0-beta.0` through `cva@1.0.0-beta.10` | `cva@1.0.0-beta.11` | [`references/beta/cva-1.0.0-beta.11.md`](references/beta/cva-1.0.0-beta.11.md) |

A row matches only when the installed version falls inside its `From` range and the requested destination equals its `To`. For example, `cva@0.0.0` to `cva@1.0.0-beta.11` does not match because `0.0.0` is outside the supported source range.

If a row matches, read that guide and only that one. Read it in full before editing, then apply only the sections it assigns to the installed version.

If no row matches on both sides, go to Step 3.

## Step 3: an uncurated route

If no row above matches on both sides, the route is not curated yet. That includes a destination with no row at all, a source outside a matching row's `From` range, and every downgrade. Research it yourself. Do not ask the user to tell you what changed in a release, and do not guess from the version number.

Gather evidence in this order:

1. The [GitHub Releases page](https://github.com/joe-bell/cva/releases) for `joe-bell/cva`, reading **every** release tagged between the installed version and the destination, not just the destination's own notes. A breaking change may have landed in an intermediate release.
2. The tagged source and package metadata for those releases: `package.json` `exports`, `peerDependencies` and `dependencies`, plus the published type declarations. Compare the installed version's tag against the destination's.
3. The published npm artifacts when a tag is missing or thin. Some early prereleases were published to npm with no GitHub release at all; `1.0.0-beta.0` and `1.0.0-beta.1` are the known cases. Those releases have no notes, so do not write notes for them, and do not present a tarball diff as if it were an announcement.
4. The consumer's own installed tree and lockfile, to know which of the changes you found actually affect this project.

Apply only the changes that evidence supports. If a release is unavailable, a gap remains unexplained, or a behavior change cannot be confirmed from source or artifacts, **stop and name the missing evidence**.

Two packages share this repository and release independently. `cva` is the beta line; `class-variance-authority` is the stable `0.x` package in maintenance mode, with its own tags and its own `latest` dist-tag. Do not read one package's releases as evidence about the other. Moving from `class-variance-authority@0.x` to `cva@1.0` is a different job with its own documentation: send the user to [What's New](https://cva.style/beta/getting-started/whats-new/).

## Curating a new route

Curate a route **before** its release is tagged and cut, in the same change as the work that needs it. Add the guide under `references/`, add its row to the table above, and land both with the implementation, so the tag already carries guidance that matches the code. Prerelease guides live in `references/beta/cva-<version>.md`; `references/` itself is reserved for stable-version guides. A release that ships first and documents later leaves every upgrader on the uncurated path.

Keep every earlier `From` version the new guide still serves: a project on an old prerelease is still a project the next release has to migrate. Only remove a row when it is wrong, never because a newer version exists.
