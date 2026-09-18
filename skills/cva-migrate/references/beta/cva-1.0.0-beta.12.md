# Migrating to `cva@1.0.0-beta.12`

This guide covers `cva@1.0.0-beta.0` through `cva@1.0.0-beta.11` upgrading to `cva@1.0.0-beta.12`. The [`cva-migrate` skill](../../SKILL.md) selects this file. Read it in full before editing, then apply only the sections the installed version needs.

`cva@1.0.0-beta.12` removes the public `cva/utils` entry point. It also carries forward every removal introduced by `beta.11`. `cva@beta` is not covered by semver and changes without warning. Treat everything here as beta-to-beta migration guidance, not a semver contract.

## What `beta.11` removed

`beta.11` removed these deprecated APIs. They remain removed in `beta.12`:

From the `"cva"` root entry:

| Removed                                               | Replacement                        |
| ----------------------------------------------------- | ---------------------------------- |
| `compose`, `Compose`                                  | the `composes` property on `cva`   |
| `defineConfig`, `DefineConfig`, `DefineConfigOptions` | the same names from `"cva/config"` |
| `getSchema`, `GetSchema`                              | the same names from `"cva/tools"`  |

From `"cva/config"`:

| Removed                                        | Replacement                                  |
| ---------------------------------------------- | -------------------------------------------- |
| the `hooks` option on `DefineConfigOptions`    | wrap your own `cx` concatenator              |
| the `compose` function `defineConfig` returned | the `composes` property on `cva`             |
| the `Compose` type                             | no replacement; the type described `compose` |

`cva/utils` was not removed in `beta.11`: it remained a deprecated identity alias of `cva/tools`, so its `getSchema` function was the same function object. The earlier guide correctly described moving an import from `cva/utils` as cleanup for `beta.11`.

## What `beta.12` removes

`beta.12` removes the `cva/utils` entry point itself. Every value and type it exposed is available from `cva/tools`:

| Removed                                 | Replacement                              |
| --------------------------------------- | ---------------------------------------- |
| `getSchema` from `"cva/utils"`          | `getSchema` from `"cva/tools"`           |
| `GetSchema` from `"cva/utils"`          | `GetSchema` from `"cva/tools"`           |
| a side-effect-only `import "cva/utils"` | delete it; the entry had no side effects |

After the upgrade, ESM `import("cva/utils")` and CommonJS `require("cva/utils")` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

What stays: `"cva"` exports `cva`, `cx`, and the public portability types. `"cva/config"` keeps `defineConfig` and its types, with a **required** `cx`. `"cva/tools"` remains the canonical home of `getSchema` and `GetSchema`. Those are the three public JavaScript entries.

## What `beta.12` adds

`beta.12` adds `cva/tailwindcss`, an optional stylesheet of custom Tailwind CSS variants, including `base:` for overridable component defaults. It requires Tailwind CSS v4 and is imported from CSS after Tailwind CSS itself:

```css
@import "tailwindcss";
@import "cva/tailwindcss";
```

It needs no migration step: existing code is unaffected, and adopting it is a separate decision. Do not add the import or rewrite classes with `base:` as part of this upgrade. See [Installation](https://cva.style/beta/getting-started/installation/#cvatailwindcss) for usage and limitations.

## Step 1: detect the package manager and workspace

Do this before running any command, and use the result for every install, script, and executable below. Do not create a second lockfile.

Check, in order:

1. `packageManager` in the consumer's `package.json`, such as `"pnpm@11.0.9"` or `"yarn@4.6.0"`. This is authoritative when present.
2. The lockfile beside it: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn), `bun.lock` or `bun.lockb` (Bun).

In a monorepo the lockfile and `packageManager` live at the repo root while `cva` is a dependency of one workspace package. Run the edits in that package and commands with the manager's workspace selector: `npm -w <pkg>`, `pnpm --filter <pkg>`, `yarn workspace <pkg>`, or `bun --filter <pkg>`.

Use this routing for every command in the rest of this guide:

| Task                         | npm                    | pnpm                | Yarn                | Bun                |
| ---------------------------- | ---------------------- | ------------------- | ------------------- | ------------------ |
| add or upgrade a dependency  | `npm install <pkg>`    | `pnpm add <pkg>`    | `yarn add <pkg>`    | `bun add <pkg>`    |
| add a development dependency | `npm install -D <pkg>` | `pnpm add -D <pkg>` | `yarn add -D <pkg>` | `bun add -d <pkg>` |
| run a local executable       | `npx <bin>`            | `pnpm exec <bin>`   | `yarn <bin>`        | `bunx <bin>`       |
| run a package script         | `npm run <script>`     | `pnpm run <script>` | `yarn <script>`     | `bun run <script>` |
| report the installed version | `npm ls cva`           | `pnpm why cva`      | `yarn why cva`      | `bun pm ls`        |

## Step 2: read the installed version

If the router supplied the version, use it. Otherwise, read the resolved version rather than the range in `package.json`. Ask the package manager from Step 1, adding its workspace selector when the project is a monorepo:

```sh
npm ls cva                # npm: installed tree
pnpm why cva              # pnpm: installed list, with the dependents
yarn why cva              # Yarn: installed resolution (Classic and Berry)
bun pm ls | grep cva      # Bun: installed tree
```

Do **not** read the version with `node -p "require('cva/package.json').version"`. `cva` only added `"./package.json"` to its exports in `beta.7`, so that command fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` on `beta.0` through `beta.6`.

Yarn Classic's `yarn info cva` queries the **registry**, not your tree, so it reports the latest published version rather than yours. Use `yarn why` for both Classic and Berry.

If the output is ambiguous because the tree contains several versions or an unknown workspace, find the resolved `cva` entry in the lockfile from Step 1. Registry metadata cannot tell you what this project installed.

Map the result to the work required. Each row lists exactly what that version needs:

| Installed            | Needs                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beta.0` to `beta.2` | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; TypeScript 6 **and** cva upgraded together; internal `_` variants; definition-time config         |
| `beta.3` to `beta.4` | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; TypeScript 6; internal `_` variants; definition-time config                                       |
| `beta.5` to `beta.7` | all of the `beta.3` row, plus root `getSchema`/`GetSchema` → `cva/tools`                                                                                                           |
| `beta.8`             | all of the `beta.5` row except internal `_` variants (they shipped in `beta.8`)                                                                                                    |
| `beta.9`             | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; `getSchema`/`GetSchema` from either the root or `cva/utils` → `cva/tools`; definition-time config |
| `beta.10`            | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; root or `cva/utils` `getSchema`/`GetSchema` → `cva/tools`                                         |
| `beta.11`            | `cva/utils` → `cva/tools`                                                                                                                                                          |

The `beta.11` row requires only the `cva/utils` move because the prior `beta.11` removals already apply. In the `beta.9` and `beta.10` rows, changing `cva/utils` was optional cleanup for `beta.11` but is required for `beta.12`.

`getSchema` did not exist before `beta.5`, so a project on `beta.0` to `beta.4` has nothing to move for it. TypeScript 6 became the floor in `beta.9`, and internal `_`-prefixed variants landed in `beta.8`, so neither applies to a project already on or past those releases.

If the project is on `class-variance-authority@0.x` rather than a `cva` beta, this is the wrong guide: the router's `class-variance-authority@0.x` row selects [`references/class-variance-authority-0.x.md`](../class-variance-authority-0.x.md) instead.

Release notes exist on GitHub from [`v1.0.0-beta.2`](https://github.com/joe-bell/cva/releases/tag/v1.0.0-beta.2) onward. `beta.0` and `beta.1` were published to npm only, with no GitHub release; do not cite release notes for them.

## Step 3: discover every affected site

Run these from the consumer package before editing anything, so you know the real scope:

```sh
rg -n --hidden --glob '!.git' --glob '!node_modules' 'cva/utils'
rg -n --hidden --glob '!.git' --glob '!node_modules' 'from ["'"'"']cva(/config|/tools)?["'"'"']'
rg -n --hidden --glob '!.git' --glob '!node_modules' '\bcompose\b|\bCompose\b'
rg -n --hidden --glob '!.git' --glob '!node_modules' 'hooks\s*:|onComplete|cx:done'
rg -n --hidden --glob '!.git' --glob '!node_modules' '\bgetSchema\b|\bGetSchema\b|\bdefineConfig\b|\bDefineConfig'
```

The exact `cva/utils` search catches static imports, including type-only and namespace imports, side-effect imports, re-exports, dynamic imports, and CommonJS `require()` calls because each form contains the same module specifier. Check these shapes explicitly:

```ts
import { getSchema } from "cva/utils";
import type { GetSchema } from "cva/utils";
import * as utils from "cva/utils";
import "cva/utils";
export { getSchema } from "cva/utils";
export * from "cva/utils";
const tools = await import("cva/utils");
const commonJsTools = require("cva/utils");
```

Without `rg`, use `grep` with the same literals:

```sh
grep -rn --exclude-dir=.git --exclude-dir=node_modules 'cva/utils' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules "from ['\"]cva(/config|/tools)?['\"]" .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules '\bcompose\b|\bCompose\b' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules 'hooks[[:space:]]*:|onComplete|cx:done' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules '\bgetSchema\b|\bGetSchema\b|\bdefineConfig\b|\bDefineConfig' .
```

`compose` is a common English word and an export from libraries such as Redux, Ramda, and Vue. `defineConfig` is also exported by Vite, Astro, and Vitest. Confirm each hit resolves to a `cva` import before editing it.

## Step 4: upgrade cva and TypeScript when they are coupled

`beta.12` requires TypeScript 6, and `beta.0` through `beta.2` cap it at `typescript >= 4.5.5 < 6`. That makes the upgrade a single move rather than two. Raising TypeScript first violates the installed `cva` cap; raising `cva` first leaves TypeScript 4 or 5 against a `cva` that requires 6. Two `add` commands are two transactions, so whichever runs first leaves an intermediate tree with an unsatisfiable peer range, which may warn or fail before the second transaction runs, depending on the package manager and its version.

**Edit both requirements in the manifest, then run one install.** Change the version ranges in place, leaving each dependency exactly where it already lives:

```diff lang="json"
  "dependencies": {
-   "cva": "1.0.0-beta.2"
+   "cva": "1.0.0-beta.12"
  },
  "devDependencies": {
-   "typescript": "^5.7.0"
+   "typescript": "^6.0.0"
  }
```

Then run one matching install, with the workspace selector from Step 1 if the project is a monorepo:

```sh
npm install
pnpm install
yarn install
bun install
```

Keep `cva` in its existing dependency block. Code imports it at runtime, so do not move it into `devDependencies`. If the project uses a pnpm catalog or Yarn resolutions, edit the entry that governs the existing dependency rather than pinning a second copy in the package manifest.

`beta.3` through `beta.8` declare `typescript >= 4.5.5` with no upper bound, but they still need TypeScript 6 for `beta.12`, so use the same single-install edit. `beta.9` through `beta.11` already require TypeScript 6, so only the `cva` range changes.

The peer dependency is marked optional. That means TypeScript may be **absent** entirely, which is what makes `cva` usable from plain JavaScript. It does not mean an installed-but-incompatible TypeScript is fine; once TypeScript is present, its version has to satisfy the range.

JavaScript-only projects change only the `cva` range and install; leave TypeScript out of it entirely.

## Step 5: apply the edits

Work through only the rows Step 2 selected.

### `cva/utils` is removed in `beta.12`

For static imports, type-only imports, namespace imports, re-exports, dynamic imports, and CommonJS `require()`, replace the module specifier with `cva/tools`. Delete a side-effect-only import instead because neither entry has import-time work to preserve.

```diff lang="ts"
- import { getSchema, type GetSchema } from "cva/utils";
+ import { getSchema, type GetSchema } from "cva/tools";

- import type { GetSchema } from "cva/utils";
+ import type { GetSchema } from "cva/tools";

- import * as utils from "cva/utils";
+ import * as utils from "cva/tools";

- import "cva/utils";

- export { getSchema } from "cva/utils";
+ export { getSchema } from "cva/tools";

- export * from "cva/utils";
+ export * from "cva/tools";

- const tools = await import("cva/utils");
+ const tools = await import("cva/tools");

- const tools = require("cva/utils");
+ const tools = require("cva/tools");
```

The path swap preserves the runtime value and the `GetSchema` type. `cva/utils` was an identity alias through `beta.11`; the breaking change is the missing path in `beta.12`, not a changed `getSchema` implementation.

### `getSchema` and `GetSchema` move from the root to `cva/tools`

`getSchema` arrived in `beta.5` on the root entry, was also exported from `cva/utils` in `beta.9`, and moved to the canonical `cva/tools` entry in `beta.10`. `beta.11` removed the root export but retained the `cva/utils` alias. `beta.12` removes that alias too.

```diff lang="ts"
- import { cva, getSchema, type GetSchema } from "cva";
+ import { cva } from "cva";
+ import { getSchema, type GetSchema } from "cva/tools";
```

`getSchema` returns one entry per variant with `values`, plus `defaultValue` when the component declares one, omitting internal (`_`-prefixed) variants and variants with no values.

### Root `defineConfig` moves to `cva/config`, and `cx` is required

Before `beta.9` there was no `cx` option at all. From `beta.9` the canonical `defineConfig` lives in `cva/config` and **requires** a `cx` concatenator; the root re-export defaulted `cx` to `clsx` and is gone in `beta.11` and `beta.12`.

If the project only ever used the default `clsx` behavior with no options, drop `defineConfig` entirely and import the preset:

```ts
import { cva, cx } from "cva";
```

This needs no new dependency. Use the explicit form below only if the project passed options:

```diff lang="ts"
- import { defineConfig } from "cva";
+ import { clsx } from "clsx";
+ import { defineConfig } from "cva/config";

- export const { cva, cx } = defineConfig();
+ export const { cva, cx } = defineConfig({ cx: clsx });
```

**Importing `clsx` directly makes it a direct dependency.** `cva` depends on `clsx` itself, but under pnpm, Yarn PnP, and other strict layouts a package may not import a dependency it does not declare. Add it with your package manager, using `clsx@^2.1.1` to match `cva`'s own dependency:

```sh
npm install clsx@^2.1.1     # or pnpm add / yarn add / bun add
```

The concatenator you pass owns the class name grammar. `cva` assembles composed child output, `base`, matched variant and compound-variant values, then `class` and `className`, and passes them through verbatim as separate arguments. Passing `twMerge` narrows the authoring surface to tailwind-merge's own input type, so object-syntax variant values start failing to type-check. That is intended; convert those values to strings or keep `clsx`.

Type imports move too: `DefineConfig` and `DefineConfigOptions` come from `"cva/config"`, and `DefineConfigOptions` no longer has a `hooks` property.

### Hooks become a custom `cx`

`onComplete` and `"cx:done"` both received the finished class name string and returned a replacement. Replace them by wrapping whatever concatenator the project is already using.

For `beta.0` through `beta.8`, there was no `cx` option, so the concatenator was `clsx`. Wrap it, and add `clsx` as a direct dependency:

```diff lang="ts"
- import { defineConfig } from "cva";
+ import { clsx } from "clsx";
+ import { defineConfig } from "cva/config";

  export const { cva, cx } = defineConfig({
-   hooks: {
-     onComplete: (className) =>
-       `${className} motion-safe:transition-colors`,
-   },
+   cx: (...inputs) =>
+     `${clsx(...inputs)} motion-safe:transition-colors`,
  });
```

For `beta.9` or `beta.10` projects that already pass their own `cx`, keep that exact concatenator and wrap its result. Do not substitute `clsx`: that would change which class values are accepted and silently drop conflict resolution the project relied on.

```diff lang="ts"
  import { defineConfig } from "cva/config";
  import { twMerge } from "tailwind-merge";

  export const { cva, cx } = defineConfig({
-   cx: twMerge,
-   hooks: {
-     onComplete: (className) =>
-       `${className} motion-safe:transition-colors`,
-   },
+   cx: (...inputs: Parameters<typeof twMerge>) =>
+     `${twMerge(...inputs)} motion-safe:transition-colors`,
  });
```

Annotating the rest parameter with `Parameters<typeof twMerge>` keeps the authoring surface identical. An unannotated `(...inputs)` infers a wider parameter type and accepts class values the original concatenator rejected.

Keep every Tailwind utility name complete in source. Do not recreate a prefixing hook as `` `prefix-${twMerge(...inputs)}` ``: [Tailwind scans source as plain text](https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names) and cannot detect the completed class names. Map dynamic values to complete static class strings. In Tailwind CSS v4, use [`@source inline()`](https://tailwindcss.com/docs/detecting-classes-in-source-files#safelisting-specific-utilities) only when the project intentionally generates utilities that do not appear in its content.

Two behavioral details to check when you rewrite a hook:

- A hook ran **after** concatenation, on the finished string. A custom `cx` runs **instead of** concatenation, so call the original concatenator and apply the hook logic to its result. Values captured from the hook's surrounding scope can remain in the new closure.
- When both hooks were set, `"cx:done"` won at runtime and `onComplete` never ran. Port only `"cx:done"` in that case; porting both would apply two transforms where one ran before.

A custom `cx` must accept zero arguments and an unbounded rest parameter, and must accept composed component strings alongside its own grammar. `cva` rejects narrower callbacks at compile time.

### `compose` becomes the `composes` property

`composes` arrived in `beta.5`; `compose` has been deprecated ever since and is removed in `beta.11` and `beta.12`.

```diff lang="ts"
- import { cva, compose } from "cva";
+ import { cva } from "cva";

  const box = cva({ base: "box" });
  const stack = cva({ base: "stack" });

- export const card = compose(box, stack);
+ export const card = cva({ composes: [box, stack] });
```

The `Compose` type is removed from both `"cva"` and `"cva/config"`. Delete a variable annotation along with the old call site.

This is not always a byte-for-byte swap. When two composed components declare `defaultVariants` for the same key, the APIs disagree:

- `compose` called each component with the caller's props only, so each one fell back to its own declared default.
- `composes` merges the defaults last-wins, then applies that single resolved value to every composed component.

```ts
const a = cva({
  variants: { pad: { sm: "p-1", lg: "p-4" } },
  defaultVariants: { pad: "sm" },
});
const b = cva({
  variants: { pad: { sm: "b-1", lg: "b-4" } },
  defaultVariants: { pad: "lg" },
});

// compose(a, b)()             => "p-1 b-4"  (each used its own default)
// cva({ composes: [a, b] })() => "p-4 b-4"  (last-wins "lg" applied to both)
```

If a converted component's output changes, check for conflicting defaults first. Declare the intended default on the composing component, where it wins over every composed default, or keep the components separate and join their output with `cx`.

Two further `composes` rules differ from `compose`:

- Pass an inline array literal or one marked `as const`. A pre-declared mutable array (`const list = [a, b]`) loses the tuple inference `composes` relies on and can silently widen or drop variant types.
- `composes` declares a structural contract: each entry must be callable and carry a `config` property. It rejects plain functions and the result of the old `compose`, whose declared return type is a bare function. A hand-built object with both members type-checks, but only components created by `cva` are supported.

If an old `compose` call mixed components with a plain function, there is no `composes` equivalent. Rebuild the call by hand, matching what `compose` did:

1. Build the forwarded props from the caller's own enumerable string-keyed entries, dropping `class`, `className`, and every entry whose value is `undefined`.
2. Call every entry in the original order, passing that same forwarded object.
3. Append the caller's `class`, then `className`, last.

Take `cva` and `cx` from the **same instance that provided the removed `compose`**. The root import below is correct only for the root preset. If the project used `defineConfig`, reuse that instance's `cva` and `cx`; importing the root preset instead would replace the configured concatenator with `clsx`, widening the authoring grammar and changing the output.

```ts
import { cva, cx } from "cva";

const box = cva({
  base: "box",
  variants: { pad: { sm: "small", lg: "large" } },
  defaultVariants: { pad: "sm" },
});
const decorate = (props?: Record<string, unknown>) =>
  props && props.pad ? "decorated" : "plain";

type BoxProps = NonNullable<Parameters<typeof box>[0]>;

const forwardedProps = (props: BoxProps) =>
  Object.fromEntries(
    Object.entries(props).filter(
      ([key, value]) =>
        key !== "class" && key !== "className" && value !== undefined,
    ),
  ) as BoxProps;

// Before: const card = compose(box, decorate);
export const card = (props?: BoxProps) => {
  const source = props ?? {};
  const forwarded = forwardedProps(source);
  return cx(
    box(forwarded),
    decorate(forwarded),
    source.class,
    source.className,
  );
};
```

Do not use rest destructuring (`const { class: _, className: __, ...forwarded } = props`) here. Rest keeps an own property whose value is `undefined`, so `{ pad: undefined }` reaches the plain function as a present `pad` key. A decorator that checks key presence would then change behavior.

Preserve the original order. Forwarding untouched props would let `box` consume the caller's `class` before `decorate` ran, turning `box small decorated extra` into `box small extra decorated`. Adding a `base` to a wrapper `cva` component would also inject another class.

This rewrite was checked against `cva@1.0.0-beta.10` with no props, `{}`, a variant, `class`, `className`, a variant plus `class`, an explicit `undefined` variant, and an `undefined` entry before a real one. It preserves `compose` output and lets each component resolve its own defaults. For more than two entries, call each one with `forwarded` in the original order.

### Internal `_`-prefixed variants from `beta.7` and earlier

`beta.8` made a variant whose name starts with `_` internal: the component still accepts it, but `VariantProps` and `getSchema` omit it. If the project declared a variant such as `_state` or `_internal` and exposed it as a public prop, that prop disappears from the derived types. Rename any variant that is meant to be public.

### Configuration is read at creation from `beta.9` and earlier

`beta.10` changed `cva` to read `base`, `variants`, `compoundVariants`, `defaultVariants`, `composes`, and each composed child's `config` **once, when the component is created**. A call reads only the props you pass plus the live `options.cx`. Mutating a config object afterwards no longer changes the output.

```diff lang="ts"
- const config = {
-   base: "button",
-   variants: { intent: { primary: "bg-blue-500" } },
- };
- const button = cva(config);
- config.variants.intent.primary = "bg-indigo-500";
+ const button = cva({
+   base: "button",
+   variants: { intent: { primary: "bg-blue-500" } },
+ });
+ const indigoButton = cva({
+   base: "button",
+   variants: { intent: { primary: "bg-indigo-500" } },
+ });
```

The snapshot is shallow: authored class values are retained, not cloned. Composition follows the same rule, so pushing a component onto a `composes` array after the fact does nothing, and editing a composed child's own config does not update the parent's merged variants. Recreate the parent.

`component.config` still exposes fresh merged `variants` and `defaultVariants` objects, but it is internal. Reading it is fine; mutating it is unsupported.

## Step 6: validate

Use the project's own package manager, from Step 1:

```sh
npx tsc --noEmit      # pnpm exec tsc --noEmit / yarn tsc --noEmit / bunx tsc --noEmit
npm test              # pnpm test / yarn test / bun run test
npm run build         # pnpm run build / yarn build / bun run build
```

Then confirm the migration actually landed:

- Re-run every Step 3 search. Nothing resolving to `cva` should still reference `compose`, `hooks`, `onComplete`, or `cx:done`; the `cva/utils` search must find no static imports, type-only imports, namespace imports, side-effect imports, re-exports, dynamic imports, or CommonJS `require()` calls.
- No file imports `defineConfig` or `getSchema` from `"cva"`, and no file resolves any form of `cva/utils`.
- Rendered class strings match the previous release. Composition default changes are silent at the type level, so diff real output for any component converted from `compose`, ideally through an existing snapshot or visual-regression test.

If the project has no test that renders class names, write a throwaway script that calls each converted component with its defaults and with each variant, and compare the strings against the same script run on the old version.

## Conflicts and escalation

Most of this migration is mechanical. Stop and ask the project's owner only when the answer is a real behavior or product decision:

- Two composed components declare conflicting `defaultVariants` for the same key, and which merged default is correct is a design call, not a mechanical one.
- A hook returned something other than a string, or its replacement changes rendered output in a way that needs sign-off.
- TypeScript 6 surfaces errors unrelated to `cva`. Whether to land that upgrade separately is a scheduling decision.
- A transitive dependency pins an older `cva` beta, so the tree holds two versions and the older copy keeps the old API. Forcing a single version means adding an override or resolution against someone else's dependency.

Do not edit `node_modules`, pin `cva` to a git revision, add a second lockfile, or silence errors with `as any` to get past a failure. Every removal above has a supported replacement.
