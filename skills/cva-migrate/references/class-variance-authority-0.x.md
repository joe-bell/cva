# Migrating from `class-variance-authority@0.6.0` through `0.7.1` to `cva@1.0.0-beta.12`

This guide covers a project on `class-variance-authority@0.6.0` through `0.7.1` moving to `cva@1.0.0-beta.12`. Those releases share one runtime implementation (`clsx`-based `cx`, `false`/`0` prop lookup, array compound selectors, `null` disabling), so one guide serves them; earlier `0.x` releases differ and are routed to research by the router. The [`cva-migrate` skill](../SKILL.md) selects this file. Read it in full before editing, then apply only the sections the project needs.

`cva` is the renamed successor of `class-variance-authority`. It is published as `cva@beta`, is not covered by semver, and changes without warning. Treat everything here as migration guidance for this exact destination, not a semver contract. The [What's New](https://cva.style/beta/getting-started/whats-new/) page is the announcement this guide implements; when the two disagree, the code wins and the gap is a bug to report.

## What changes

Required for every project:

| Change                                                 | Section                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| The package name and every import specifier            | [Step 5.1](#51-rename-the-package-and-its-imports) |
| `cva(base, config)` becomes `cva({ base, ...config })` | [Step 5.2](#52-move-base-into-the-config-object)   |
| TypeScript 6 or later, when TypeScript is installed    | [Step 4](#step-4-swap-the-dependency)              |

Required only when the project uses the feature:

| Change                                                                        | Section                                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `class-variance-authority/types` is gone; `CxOptions`/`CxReturn` are renamed  | [Step 5.3](#53-fix-type-imports)                                      |
| `null` is no longer accepted in props, defaults, or compound selectors        | [Step 5.4](#54-replace-null-with-an-explicit-variant-option)          |
| `_`-prefixed variants leave `VariantProps`; `__proto__` is rejected as a name | [Step 5.5](#55-check-variant-names)                                   |
| Explicit generic arguments to `cva<…>()` are rejected                         | [Step 5.6](#56-remove-generic-arguments)                              |
| Configuration is read once, when the component is created                     | [Step 5.7](#57-stop-mutating-configuration-after-creation)            |
| A `twMerge(component(props))` wrapper can become a configured concatenator    | [Step 5.8](#58-optional-move-a-tailwind-merge-wrapper-into-cvaconfig) |

Runtime output for existing calls is otherwise unchanged. Both packages emit base, variant classes in declaration order, matching compound classes, then `class` and `className`; both stringify `false` and `0` for lookup; both treat an omitted prop and an explicit `undefined` as the default. These were checked against the built `class-variance-authority@0.7.1` and `cva@1.0.0-beta.12` artifacts; `0.6.0` through `0.7.1` share the same runtime source apart from formatting, and `0.6.1` added the `class-variance-authority/types` subpath.

New in `cva` and needing no migration step: the `composes` property, `getSchema` from `cva/tools`, `defineConfig` from `cva/config`, and the `cva/tailwindcss` stylesheet. Adopting any of them is a separate decision; do not add them as part of this upgrade. [What's New](https://cva.style/beta/getting-started/whats-new/) describes each one.

## Step 1: detect the package manager and workspace

Do this before running any command, and use the result for every install, script, and executable below. Do not create a second lockfile.

Check, in order:

1. `packageManager` in the consumer's `package.json`, such as `"pnpm@11.0.9"` or `"yarn@4.6.0"`. This is authoritative when present.
2. The lockfile beside it: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn), `bun.lock` or `bun.lockb` (Bun).

In a monorepo the lockfile and `packageManager` live at the repo root while `class-variance-authority` is a dependency of one workspace package. Run the edits in that package and commands with the manager's workspace selector: `npm -w <pkg>`, `pnpm --filter <pkg>`, `yarn workspace <pkg>`, or `bun --filter <pkg>`.

Use this routing for every command in the rest of this guide:

| Task                         | npm                               | pnpm                                | Yarn                                | Bun                |
| ---------------------------- | --------------------------------- | ----------------------------------- | ----------------------------------- | ------------------ |
| add or upgrade a dependency  | `npm install <pkg>`               | `pnpm add <pkg>`                    | `yarn add <pkg>`                    | `bun add <pkg>`    |
| remove a dependency          | `npm uninstall <pkg>`             | `pnpm remove <pkg>`                 | `yarn remove <pkg>`                 | `bun remove <pkg>` |
| run a package script         | `npm run <script>`                | `pnpm run <script>`                 | `yarn <script>`                     | `bun run <script>` |
| report the installed version | `npm ls class-variance-authority` | `pnpm why class-variance-authority` | `yarn why class-variance-authority` | `bun pm ls`        |

## Step 2: confirm the installed package

If the router supplied the version, use it. Otherwise, confirm which `class-variance-authority` version the package being migrated resolves:

```sh
npm ls class-variance-authority cva
pnpm why class-variance-authority
yarn why class-variance-authority
bun pm ls | grep -E 'class-variance-authority|cva'
```

`0.6.0` through `0.7.1` share the public API this guide migrates: `cva(base, config)`, `cx`, `VariantProps`, `CxOptions`, `CxReturn`, and (from `0.6.1`) the `class-variance-authority/types` entry. A resolved version below `0.6.0` is outside this guide; hand it back to the router for research.

The source is decided by the package being migrated and its own import sites, not by what else is in the tree. Another dependency may already pull in a `cva` beta, and a partly migrated monorepo may contain both packages; neither changes the fact that this package imports `class-variance-authority` and needs this guide. Only a package whose own imports already point at `cva` routes from that `cva` version instead.

If several packages in a monorepo depend on `class-variance-authority`, migrate each one. A shared component library that re-exports `cva` types needs its own consumers migrated in the same change, because the renamed types in [Step 5.3](#53-fix-type-imports) appear in its declarations.

## Step 3: discover every affected site

Run these from the consumer package before editing anything, so you know the real scope:

```sh
rg -n --hidden --glob '!.git' --glob '!node_modules' 'class-variance-authority'
rg -n --hidden --glob '!.git' --glob '!node_modules' '\bCxOptions\b|\bCxReturn\b'
rg -n --hidden --glob '!.git' --glob '!node_modules' '\bcva\s*<'
rg -n --hidden --glob '!.git' --glob '!node_modules' '\bcva\('
```

Without `rg`, use `grep` with the same literals:

```sh
grep -rn --exclude-dir=.git --exclude-dir=node_modules 'class-variance-authority' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules '\bCxOptions\b|\bCxReturn\b' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules '\bcva[[:space:]]*<' .
grep -rnE --exclude-dir=.git --exclude-dir=node_modules '\bcva\(' .
```

The first search finds every import, re-export, `require()`, and config string (bundler aliases, test mocks, lint rules). For each import it finds, note the local binding: an aliased import (`import { cva as variants }`), a namespace import (`import * as cva`), a destructured `require()`, or a module that re-exports the function under another name. The last search only catches calls spelled `cva(`; trace every other binding to its call sites by name, including in files that import the re-exporting module, so the component list is complete. Open each definition for the edits in Step 5, since `null` usage, `_`-prefixed keys, and post-creation mutation are not reliably searchable. Also search the project's own generated `.d.ts` output, if it publishes types, for `class-variance-authority` in declaration files.

## Step 4: swap the dependency

`cva` declares an optional peer dependency on `typescript >= 6.0.0`. `class-variance-authority` declares none. Once TypeScript is present in the project, its version has to satisfy that range; JavaScript-only projects skip TypeScript entirely.

**Edit the manifest, then run one install.** Replace the dependency in place, in the block where it already lives, and raise TypeScript in the same edit when the project is below 6:

```diff lang="json"
  "dependencies": {
-   "class-variance-authority": "^0.7.1"
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

Pin the exact `cva` prerelease rather than a caret range: `cva@beta` is not covered by semver, and `cva`'s npm `latest` tag is parked at `0.0.0`, so a bare `cva` or `^1.0.0` range does not resolve to a usable version. Keep it in the dependency block `class-variance-authority` occupied; code imports it at runtime, so do not move it into `devDependencies`. If the project uses a pnpm catalog or Yarn resolutions, edit the entry that governs the existing dependency rather than pinning a second copy.

`clsx` remains the only runtime dependency, at the same `^2.1.1` range, so a project that also imports `clsx` directly needs no change there.

## Step 5: apply the edits

Apply 5.1 and 5.2 to every component first. The examples from 5.3 onward assume the single-object form is already in place.

### 5.1 Rename the package and its imports

Replace the module specifier everywhere Step 3 found it. Static imports, type-only imports, namespace imports, re-exports, dynamic imports, and CommonJS `require()` calls all change the same way:

```diff lang="ts"
- import { cva, cx, type VariantProps } from "class-variance-authority";
+ import { cva, cx, type VariantProps } from "cva";

- export * from "class-variance-authority";
+ export * from "cva";

- const { cva } = require("class-variance-authority");
+ const { cva } = require("cva");
```

`cva` and `cx` keep their names and `cx` keeps its `clsx` behavior, so call sites of `cx` do not change.

Update non-code references too. Tailwind CSS IntelliSense settings use function names rather than the package name, so `"tailwindCSS.classFunctions": ["cva", "cx"]` is unchanged; but a bundler alias, a Jest or Vitest `moduleNameMapper`, or an ESLint `no-restricted-imports` rule that names `class-variance-authority` needs the new name. A project still on the older `classRegex` IntelliSense recipe keeps working; switching it to `classFunctions` per [IntelliSense](https://cva.style/beta/getting-started/installation/#intellisense) is optional and separate from this migration.

### 5.2 Move `base` into the config object

`cva` takes one argument, a config object, and `base` is a property of it. The config object is required.

```diff lang="ts"
- const button = cva("button", {
+ const button = cva({
+   base: "button",
    variants: { intent: { primary: "button--primary" } },
    defaultVariants: { intent: "primary" },
  });

- const box = cva(["box", "box-border"]);
+ const box = cva({ base: ["box", "box-border"] });

- const empty = cva();
+ const empty = cva({});
```

`base` accepts the same values the first argument did: a string, an array, or any other `clsx` value. A first argument of `null` or `undefined` simply disappears; write `cva({ variants })` without a `base` key. TypeScript catches the zero-argument and two-argument forms (`TS2554`), but **not** a single-argument `cva("button")` or `cva(["box"])`: those type-check, read no `base`, and emit nothing at runtime. A base-only component is therefore the easiest call to miss, so rewrite every `cva(` hit from Step 3 rather than relying on the type checker.

### 5.3 Fix type imports

`cva` has no `types` entry point. The types the predecessor exported now come from the `cva` root, and two names changed case:

```diff lang="ts"
- import type { ClassValue } from "class-variance-authority/types";
- import type { CxOptions, CxReturn, VariantProps } from "class-variance-authority";
+ import type { ClassValue, CXOptions, CXReturn, VariantProps } from "cva";
```

Available from `cva`: `ClassValue`, `ClassArray`, `ClassDictionary`, `VariantProps`, `CX`, `CXOptions`, `CXReturn`, plus the portability types that appear in generated declarations. `VariantProps` behaves as before, except that it omits `_`-prefixed variants ([Step 5.5](#55-check-variant-names)).

No longer exported: `ClassProp`, `ClassPropKey`, `OmitUndefined`, and `StringToBoolean`. If the project used them, inline these definitions, with `ClassValue` imported from `cva`:

```ts
import type { ClassValue } from "cva";

type ClassPropKey = "class" | "className";
type ClassProp =
  | { class: ClassValue; className?: never }
  | { class?: never; className: ClassValue }
  | { class?: never; className?: never };
type OmitUndefined<T> = T extends undefined ? never : T;
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;
```

A project that publishes declarations with `class-variance-authority` in them needs its consumers to migrate at the same time, because the emitted `.d.ts` files now name `cva` types.

### 5.4 Replace `null` with an explicit variant option

`class-variance-authority` accepted `null` as a prop value to disable a variant, and in `defaultVariants` and compound selectors. `cva` rejects `null` in all three places at the type level.

At runtime the difference matters for JavaScript callers, and it is not the same as passing `undefined`:

- For the variant's own class, a `null` prop no longer disables anything: `cva` falls back to the declared default, as it does for `undefined`.
- For compound variants, the `null` value is still compared as-is, so a compound selector that would match the default does not match. `null` input is unsupported by `cva`, and its output is a side effect of the fallback rather than a contract. Do not leave it in.

Declare an explicit option instead, and pass that option where the code passed `null`. The recommended name is `unset`:

```diff lang="ts"
  const button = cva({
    base: "button",
    variants: {
      intent: {
+       unset: null,
        primary: "button--primary",
        secondary: "button--secondary",
      },
    },
    defaultVariants: { intent: "primary" },
  });

- button({ intent: null });
+ button({ intent: "unset" });
+ // => "button"
```

`null` is still valid as a variant **value** (the `unset: null` above): it means "emit no class for this option". Only its use as a prop, default, or compound selector is gone. Migrate every `null` to the explicit option consistently: `defaultVariants: { intent: null }` becomes `defaultVariants: { intent: "unset" }`, and a compound selector `{ intent: null, class: "…" }` becomes `{ intent: "unset", class: "…" }`. Deleting a `null` default instead is only equivalent when no compound selector on that key matched the `null`; with `defaultVariants: { intent: null }` and `compoundVariants: [{ intent: null, class: "disabled" }]`, `0.7.1` emits `disabled` for a call with no props, keeping the default as `"unset"` preserves that, and deleting it drops the class.

### 5.5 Check variant names

Two naming rules are new.

**Underscore-prefixed variants are internal.** A variant whose name starts with `_` still works when passed to the component directly, still takes a default, and still matches in compound variants, but `VariantProps` omits it, and so does `getSchema`. If the project exposed such a variant as a public prop through `VariantProps`, the key disappears from the derived type; callers may then get an unknown-prop error, or may pass the value unchecked when the wrapper has no other props, so search the definitions from Step 3 for `_`-prefixed keys rather than relying on diagnostics. Rename the variant to drop the prefix, or keep the prefix and set the variant from inside the wrapper as [Internal variants](https://cva.style/beta/getting-started/variants/#internal-variants) describes.

**`__proto__` is rejected.** A variant literally named `__proto__` fails to type-check. Rename it.

### 5.6 Remove generic arguments

`class-variance-authority` inferred its variant types from the config but did not stop callers from supplying a type argument. `cva` does:

```diff lang="ts"
- const button = cva<{ intent: { primary: string } }>({ /* … */ });
+ const button = cva({ /* … */ });
```

Delete the argument and let inference run. If the argument existed to widen or narrow the accepted props, express that with `VariantProps` and TypeScript utility types on the wrapper instead; see [TypeScript](https://cva.style/beta/getting-started/typescript/).

### 5.7 Stop mutating configuration after creation

`class-variance-authority` read the config object on every call, so code that mutated it afterwards changed later output. `cva` reads `base`, `variants`, `compoundVariants`, and `defaultVariants` once, when the component is created, and treats the config as immutable from then on. How much of a later mutation shows up is undefined.

Search each component definition from Step 3 for later writes to its config, including code that builds a config incrementally and calls `cva` before the last write. Create a new component after the config is complete instead:

```diff lang="ts"
- const config = { base: "button", variants: { tone: { info: "info" } } };
- const button = cva(config);
- config.variants.tone.warning = "warning";
+ const button = cva({
+   base: "button",
+   variants: { tone: { info: "info", warning: "warning" } },
+ });
```

The snapshot is shallow: authored class values are retained, not cloned. Frozen configs work, and `cva` never mutates or freezes anything passed to it.

### 5.8 Optional: move a `tailwind-merge` wrapper into `cva/config`

The `0.x` docs recommended wrapping each component call in `twMerge`. That pattern keeps working after the rename. If the project wants one configured `cva` instead, `cva/config` accepts the concatenator directly:

Create the configured instance in a new file:

```ts
// cva.config.ts
import { defineConfig } from "cva/config";
import { cx as joinClasses } from "cva";
import { twMerge } from "tailwind-merge";

export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(joinClasses(...inputs)),
});
```

Then, in each component, import `cva` from that file and drop the wrapper. The component keeps its export:

```diff lang="ts"
- import { cva, type VariantProps } from "class-variance-authority";
- import { twMerge } from "tailwind-merge";
+ import type { VariantProps } from "cva";
+ import { cva } from "./cva.config";

- const buttonVariants = cva(["button"], { /* … */ });
- export const button = (props: VariantProps<typeof buttonVariants>) =>
-   twMerge(buttonVariants(props));
+ export const button = cva({ base: "button", /* … */ });
+ export type ButtonProps = VariantProps<typeof button>;
```

The migrated `button` is now a `cva` component: its public type also accepts `class` and `className`, and conflict resolution is retained because the configured `cx` runs inside every call. Wrapping `joinClasses` keeps object and array syntax working; passing bare `twMerge` narrows the accepted values to strings and arrays. [Handling class conflicts](https://cva.style/beta/getting-started/installation/#handling-class-conflicts) covers this and the `cn` and `cva/tailwindcss` alternatives. This step changes no output for string-authored components and is optional.

## Step 6: verify

1. Run the searches from Step 3 again. The package name must not appear anywhere in the migrated package's source or manifest; only the lockfile, or a genuine transitive dependency of another package, may still carry it. `CxOptions`/`CxReturn` must be gone.
2. Confirm every `cva(` hit and every traced alias from Step 3 was visited. A clean type check does not prove this, because a single-argument `cva("base")` type-checks and renders nothing. Then run the project's type check. Every remaining error should trace to one of the sections above: a `TS2554 Expected 1 arguments` on `cva()` or `cva(base, config)` means a missed [Step 5.2](#52-move-base-into-the-config-object), and an unknown-prop error on a wrapper points at [Step 5.5](#55-check-variant-names).
3. Run the project's tests, or snapshot the output of each migrated component before and after with the same props. Calls that passed `null` and now pass the explicit option should match the old output; any other difference is a missed step.
4. Confirm the resolved version with the "report the installed version" command from Step 1, replacing the package name with `cva`.

## Conflicts and escalation

Most of this migration is mechanical. Stop and ask the project's owner only when the answer is a real behavior or product decision:

- TypeScript 6 surfaces errors unrelated to `cva`. Whether to land that upgrade separately is a scheduling decision.
- A `null` default or compound selector in [Step 5.4](#54-replace-null-with-an-explicit-variant-option) encodes behavior nobody can explain. Which output is intended is a product call.
- A `_`-prefixed variant is part of a published library's public props. Renaming it is an API change for that library's consumers.

Another dependency, typically a UI library, may still depend on `class-variance-authority`. That copy keeps working on its own and both packages can coexist in one tree, so continue without adding an override or resolution against someone else's dependency. Escalate only if a dependency constraint actually prevents installing `cva`.

Do not edit `node_modules`, pin `cva` to a git revision, add a second lockfile, or silence errors with `as any` to get past a failure. Every change above has a supported replacement.
