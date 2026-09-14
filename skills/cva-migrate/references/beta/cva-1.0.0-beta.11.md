# Migrating to `cva@1.0.0-beta.11`

The curated guide for the `cva@1.0.0-beta.0` through `cva@1.0.0-beta.10` to `cva@1.0.0-beta.11` route. The [`cva-migrate` skill](../../SKILL.md) selects this file; read it in full before editing, then apply only the sections the installed version needs.

`cva@1.0.0-beta.11` removes the deprecated APIs listed below. It does not remove every deprecation: `cva/utils` is deprecated and deliberately survives.

`cva@beta` is not covered by semver and changes without warning. Treat everything here as beta-to-beta migration guidance, not a semver contract.

## What `beta.11` removes

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

What stays: `"cva"` exports `cva`, `cx`, and the public types. `"cva/config"` keeps `defineConfig` and its types, still with a **required** `cx`. `"cva/tools"` is unchanged and remains the canonical home of `getSchema` and `GetSchema`. `"cva/utils"` also remains: it is deprecated, but it is a true identity alias of `"cva/tools"` (`getSchema` is the same function object), so code importing from it keeps working.

## Step 1: detect the package manager and the workspace

Do this before running any command, and use the result for every install, script and executable below. Creating a second lockfile is worse than the migration it was meant to serve.

Check, in order:

1. `packageManager` in the consumer's `package.json` (`"pnpm@11.0.9"`, `"yarn@4.6.0"`, …). This is authoritative when present.
2. The lockfile beside it: `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn), `bun.lock` or `bun.lockb` (Bun).

In a monorepo the lockfile and `packageManager` live at the repo root while `cva` is a dependency of one workspace package. Run the edits in that package and the commands with the manager's workspace selector: `npm -w <pkg>`, `pnpm --filter <pkg>`, `yarn workspace <pkg>`, `bun --filter <pkg>`.

Use this routing for every command in the rest of this guide:

| Task                         | npm                    | pnpm                | Yarn                | Bun                |
| ---------------------------- | ---------------------- | ------------------- | ------------------- | ------------------ |
| add/upgrade a dependency     | `npm install <pkg>`    | `pnpm add <pkg>`    | `yarn add <pkg>`    | `bun add <pkg>`    |
| add a dev dependency         | `npm install -D <pkg>` | `pnpm add -D <pkg>` | `yarn add -D <pkg>` | `bun add -d <pkg>` |
| run a local executable       | `npx <bin>`            | `pnpm exec <bin>`   | `yarn <bin>`        | `bunx <bin>`       |
| run a package script         | `npm run <script>`     | `pnpm run <script>` | `yarn <script>`     | `bun run <script>` |
| report the installed version | `npm ls cva`           | `pnpm why cva`      | `yarn why cva`      | `bun pm ls`        |

## Step 2: read the installed version

The router already reads this to pick the route. Confirm it here anyway when you did not read it yourself, because every row below depends on the exact version. Read what is resolved and installed, not the range in `package.json`. Ask the package manager from Step 1, adding its workspace selector when the project is a monorepo:

```sh
npm ls cva                # npm: installed tree
pnpm why cva              # pnpm: installed list, with the dependents
yarn why cva              # Yarn: installed resolution (Classic and Berry)
bun pm ls | grep cva      # Bun: installed tree
```

Do **not** read the version with `node -p "require('cva/package.json').version"`. `cva` only added `"./package.json"` to its `exports` in `beta.7`, so on `beta.0` through `beta.6` that command fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, which is precisely the range this guide most needs to identify.

Yarn Classic's `yarn info cva` queries the **registry**, not your tree, so it reports the latest published version rather than yours. `yarn why` is the one that answers for both Classic and Berry.

If the output is ambiguous (several versions in the tree, or a workspace you cannot attribute), read the lockfile you identified in Step 1 and find the resolved `cva` entry there. Reach for the lockfile, never for registry metadata: the registry cannot tell you what this project installed.

Map the result to the work required. Each row lists exactly what that version needs:

| Installed            | Needs                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beta.0` to `beta.2` | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; TypeScript 6 **and** cva upgraded together (see Step 4); internal `_` variants; definition-time config |
| `beta.3` to `beta.4` | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; TypeScript 6; internal `_` variants; definition-time config                                            |
| `beta.5` to `beta.7` | all of the `beta.3` row, plus root `getSchema`/`GetSchema` → `cva/tools`                                                                                                                |
| `beta.8`             | all of the `beta.5` row except internal `_` variants (they shipped in `beta.8`)                                                                                                         |
| `beta.9`             | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; `getSchema`/`GetSchema` from **either** the root or `cva/utils` → `cva/tools`; definition-time config  |
| `beta.10`            | `compose` → `composes`; root `defineConfig` → `cva/config`; hooks → custom `cx`; root or `cva/utils` `getSchema`/`GetSchema` → `cva/tools`                                              |

`getSchema` did not exist before `beta.5`, so a project on `beta.0` to `beta.4` has nothing to move for it. TypeScript 6 became the floor in `beta.9`, and internal `_`-prefixed variants landed in `beta.8`, so neither applies to a project already on or past those.

If the project is on `class-variance-authority@0.x` rather than a `cva` beta, this is the wrong guide: follow [What's New](https://cva.style/beta/getting-started/whats-new/) instead, then come back here.

Release notes exist on GitHub from [`v1.0.0-beta.2`](https://github.com/joe-bell/cva/releases/tag/v1.0.0-beta.2) onward. `beta.0` and `beta.1` were published to npm only, with no GitHub release; do not cite release notes for them.

## Step 3: discover every affected site

Run these from the consumer package before editing anything, so you know the real scope:

```sh
rg -n 'from ["'"'"']cva(/config|/tools|/utils)?["'"'"']' --glob '!node_modules'
rg -n '\bcompose\b|\bCompose\b' --glob '!node_modules'
rg -n 'hooks\s*:|onComplete|cx:done' --glob '!node_modules'
rg -n '\bgetSchema\b|\bGetSchema\b|\bdefineConfig\b|\bDefineConfig' --glob '!node_modules'
```

Without `rg`, use `grep` with the same patterns:

```sh
grep -rnE "from ['\"]cva(/config|/tools|/utils)?['\"]" . --exclude-dir=node_modules
grep -rnE '\bcompose\b|\bCompose\b' . --exclude-dir=node_modules
grep -rnE 'hooks[[:space:]]*:|onComplete|cx:done' . --exclude-dir=node_modules
grep -rnE '\bgetSchema\b|\bGetSchema\b|\bdefineConfig\b|\bDefineConfig' . --exclude-dir=node_modules
```

`compose` is a common English word and a common export elsewhere (Redux, Ramda, Vue). `defineConfig` is also Vite's, Astro's and Vitest's. Confirm each hit resolves to a `cva` import before touching it.

## Step 4: upgrade cva (and TypeScript, when they are coupled)

`beta.11` requires TypeScript 6, and `beta.0` through `beta.2` cap it at `typescript >= 4.5.5 < 6`. That makes the upgrade a single move rather than two. Raising TypeScript first violates the installed `cva`'s cap; raising `cva` first leaves TypeScript 4 or 5 against a `cva` that requires 6. Two `add` commands are two transactions, so whichever runs first leaves an intermediate tree with an unsatisfiable peer range, which may warn or fail before the second transaction runs, depending on the package manager and its version.

**Edit both requirements in the manifest, then run one install.** Change the version ranges in place, leaving each dependency exactly where it already lives:

```diff lang="json"
  "dependencies": {
-   "cva": "1.0.0-beta.2"
+   "cva": "1.0.0-beta.11"
  },
  "devDependencies": {
-   "typescript": "^5.7.0"
+   "typescript": "^6.0.0"
  }
```

Then a single matching install, with the workspace selector from Step 1 if the project is a monorepo:

```sh
npm install
pnpm install
yarn install
bun install
```

Keep `cva` in whichever block already declares it. It is a runtime dependency of the code that imports it, so do not take this as an excuse to move it into `devDependencies`. If the project uses a pnpm catalog, or Yarn resolutions, edit the range in the catalog or resolution entry that actually governs it rather than pinning a second copy in the package manifest.

`beta.3` through `beta.8` declare `typescript >= 4.5.5` with no upper bound, but they still need TypeScript 6 for `beta.11`, so use the same single-install edit. `beta.9` and `beta.10` already require TypeScript 6, so only the `cva` range changes.

The peer dependency is marked optional. That means TypeScript may be **absent** entirely, which is what makes `cva` usable from plain JavaScript. It does not mean an installed-but-incompatible TypeScript is fine; once TypeScript is present, its version has to satisfy the range.

JavaScript-only projects change only the `cva` range and install; leave TypeScript out of it entirely.

## Step 5: apply the edits

Work through only the rows Step 2 selected.

### Root `defineConfig` moves to `cva/config`, and `cx` is required

Before `beta.9` there was no `cx` option at all. From `beta.9` the canonical `defineConfig` lives in `cva/config` and **requires** a `cx` concatenator; the root re-export defaulted `cx` to `clsx` and is gone in `beta.11`.

If the project only ever used the default `clsx` behavior with no options, drop `defineConfig` entirely and import the preset:

```ts
import { cva, cx } from "cva";
```

That is the smallest correct change, and it needs no new dependency. Only reach for the explicit form below if the project actually passed options:

```diff lang="ts"
- import { defineConfig } from "cva";
+ import { clsx } from "clsx";
+ import { defineConfig } from "cva/config";

- export const { cva, cx } = defineConfig();
+ export const { cva, cx } = defineConfig({ cx: clsx });
```

**Importing `clsx` directly makes it a direct dependency.** `cva` depends on `clsx` itself, but under pnpm, Yarn PnP and other strict layouts a package may not import a dependency it does not declare. Add it:

```sh
npm install clsx@^2.1.1     # or pnpm add / yarn add / bun add
```

`^2.1.1` matches what `cva` itself depends on. Any version compatible with your other `clsx` usage works.

The concatenator you pass owns the class name grammar. `cva` assembles composed child output, `base`, matched variant and compound-variant values, then `class`/`className`, and passes them through verbatim as separate arguments. Passing `twMerge` narrows the authoring surface to tailwind-merge's own input type, so object-syntax variant values start failing to type-check. That is intended; convert those values to strings or keep `clsx`.

Type imports move too: `DefineConfig` and `DefineConfigOptions` come from `"cva/config"`, and `DefineConfigOptions` no longer has a `hooks` property.

### `getSchema` and `GetSchema` move to `cva/tools`

`getSchema` arrived in `beta.5` on the root entry, gained a `cva/utils` home in `beta.9`, and moved to the canonical `cva/tools` in `beta.10`. Move both older paths to `cva/tools`. Only the root import is actually removed in `beta.11`, so that one is a required fix; the `cva/utils` import still works and is a cleanup.

```diff lang="ts"
- import { cva, getSchema, type GetSchema } from "cva";
+ import { cva } from "cva";
+ import { getSchema, type GetSchema } from "cva/tools";
```

```diff lang="ts"
- import { getSchema, type GetSchema } from "cva/utils";
+ import { getSchema, type GetSchema } from "cva/tools";
```

`cva/utils` still exists in `beta.11` and is a true identity alias: it re-exports `cva/tools`' own function object, so `getSchema` imported from either path is the same value. Code left on `cva/utils` keeps working. Move it anyway, because `cva/utils` stays deprecated and `cva/tools` is canonical.

The behavior is identical across all three paths. `getSchema` returns one entry per variant with `values`, plus `defaultValue` when the component declares one, omitting internal (`_`-prefixed) variants and variants with no values.

### Hooks become a custom `cx`

`onComplete` and `"cx:done"` both received the finished class name string and returned a replacement. Replace them by wrapping whatever concatenator the project is already using.

**If the project was on `beta.0` to `beta.8`**, there was no `cx` option, so the concatenator was `clsx`. Wrap it, and add `clsx` as a direct dependency as described above:

```diff lang="ts"
- import { defineConfig } from "cva";
+ import { clsx } from "clsx";
+ import { defineConfig } from "cva/config";

  export const { cva, cx } = defineConfig({
-   hooks: {
-     onComplete: (className) => `prefix-${className}`,
-   },
+   cx: (...inputs) => `prefix-${clsx(...inputs)}`,
  });
```

**If the project was on `beta.9` or `beta.10` and already passed its own `cx`**, keep that exact concatenator and wrap its result. Do not substitute `clsx`: that would change which class values are accepted and silently drop whatever conflict resolution the project relied on.

```diff lang="ts"
  import { defineConfig } from "cva/config";
  import { twMerge } from "tailwind-merge";

  export const { cva, cx } = defineConfig({
-   cx: twMerge,
-   hooks: {
-     onComplete: (className) => `prefix-${className}`,
-   },
+   cx: (...inputs: Parameters<typeof twMerge>) => `prefix-${twMerge(...inputs)}`,
  });
```

Annotating the rest parameter with `Parameters<typeof twMerge>` is what keeps the authoring surface identical. An unannotated `(...inputs)` infers a wider parameter type, which quietly reopens class values the original concatenator rejected.

Two behavioral details to check when you rewrite a hook:

- A hook ran **after** concatenation, on the finished string. A custom `cx` runs **instead of** concatenation, so call the original concatenator yourself and apply the hook logic to its result, exactly as above. State the hook captured from its surrounding scope still works: a `cx` closure closes over the same variables a hook did.
- When both hooks were set, `"cx:done"` won at runtime and `onComplete` never ran. Port only `"cx:done"` in that case; porting both would apply two transforms where one ran before.

A custom `cx` must accept zero arguments and an unbounded rest parameter, and must accept composed component strings alongside its own grammar. `cva` rejects narrower callbacks at compile time.

### `compose` becomes the `composes` property

`composes` arrived in `beta.5`; `compose` has been deprecated ever since and is removed in `beta.11`.

```diff lang="ts"
- import { cva, compose } from "cva";
+ import { cva } from "cva";

  const box = cva({ base: "box" });
  const stack = cva({ base: "stack" });

- export const card = compose(box, stack);
+ export const card = cva({ composes: [box, stack] });
```

The `Compose` type is removed from both `"cva"` and `"cva/config"`. A variable annotated with it should be deleted along with the call site.

**This is not always a byte-for-byte swap.** When two composed components declare `defaultVariants` for the _same_ key, the two APIs disagree:

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

If a converted component's output changes, this is almost always why. Fix it by declaring the intended default on the composing component (`defaultVariants` there wins over every composed default), or by keeping the components separate and joining their output with `cx` yourself.

Two further `composes` rules that differ from `compose`:

- Pass an inline array literal or one marked `as const`. A pre-declared mutable array (`const list = [a, b]`) loses the tuple inference `composes` relies on and can silently widen or drop variant types.
- `composes` declares a structural contract: each entry must be callable and carry a `config` property. A plain function has no `config` and is rejected, and so is the result of the old `compose`, whose declared return type is a bare function. A hand-built object with both members will type-check, but only components created by `cva` are supported; anything else is relying on an internal shape that can change.

If an old `compose` call mixed components with a plain function, there is no `composes` equivalent, because the plain function has no `config`. Rebuild the call by hand instead, matching what `compose` actually did:

1. Build the forwarded props from the caller's own enumerable string-keyed entries, dropping `class`, `className`, and every entry whose value is `undefined`. Dropping `undefined` is what let a composed component fall back to its own default.
2. Call every entry in the original order, passing that same forwarded object.
3. Append the caller's `class`, then `className`, last.

Take `cva` and `cx` from the **same instance the removed `compose` came from**. The root import below is correct only when that `compose` was the root preset's. If the project built its own with `defineConfig`, reuse that instance's `cva` and `cx` (`export const { cva, cx } = defineConfig({ cx: twMerge })`, then `import { cva, cx } from "./cva.config"`). Reaching for the root preset there would swap the configured concatenator for `clsx`, widening the authoring grammar and changing the rendered output.

```ts
import { cva, cx } from "cva";

const box = cva({
  base: "box",
  variants: { pad: { sm: "small", lg: "large" } },
  defaultVariants: { pad: "sm" },
});
// The plain function `compose` tolerated; it received the forwarded props.
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

Do not reach for rest destructuring (`const { class: _, className: __, ...forwarded } = props`) here. It looks equivalent and is not: rest keeps an own property whose value is `undefined`, so `{ pad: undefined }` reaches the plain function as a present `pad` key. A decorator that branches on key presence rather than truthiness then changes behavior. Rebuilding from entries drops those keys the way `compose` did.

Order matters just as much. Forwarding the untouched props would let `box` consume the caller's `class` before `decorate` ran, turning `box small decorated extra` into `box small extra decorated`. Adding a `base` to a wrapper `cva` component would inject another class too.

This rewrite is output-identical to `compose`, checked against `cva@1.0.0-beta.10` with a decorator that reports key presence, across no props, `{}`, a variant, `class`, `className`, a variant plus `class`, an explicit `undefined` variant, and an `undefined` entry ahead of a real one. It also sidesteps the conflicting-default caveat, because each component still resolves its own defaults exactly as it did under `compose`. Extend the same shape for more than two entries: call each one with `forwarded`, in the original order.

### Internal `_`-prefixed variants (from `beta.7` and earlier)

`beta.8` made a variant whose name starts with `_` internal: the component still accepts it, but `VariantProps` and `getSchema` omit it. If the project declared a variant such as `_state` or `_internal` and exposed it as a public prop, that prop disappears from the derived types. Rename any variant that is meant to be public.

### Configuration is read at creation (from `beta.9` and earlier)

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

- Re-run the Step 3 searches. Nothing resolving to `cva` should still reference `compose`, `hooks`, `onComplete` or `cx:done`.
- No file imports `defineConfig` or `getSchema` from `"cva"`, and no file imports `getSchema` from `"cva/utils"`.
- Rendered class strings match the previous release. Composition default changes are silent at the type level, so diff real output for any component converted from `compose`, ideally through an existing snapshot or visual-regression test.

If the project has no test that renders class names, write a throwaway script that calls each converted component with its defaults and with each variant, and compare the strings against the same script run on the old version.

## Conflicts and escalation

Most of this migration is mechanical. Stop and ask the project's owner only when the answer is a real behavior or product decision:

- Two composed components declare conflicting `defaultVariants` for the same key, and which merged default is correct is a design call, not a mechanical one.
- A hook returned something other than a string, or its replacement changes rendered output in a way that needs sign-off.
- TypeScript 6 surfaces errors unrelated to `cva`. Whether to land that upgrade separately is a scheduling decision.
- A transitive dependency pins an older `cva` beta, so the tree holds two versions and the older copy keeps the old API. Forcing a single version means adding an override or resolution against someone else's dependency.

Do not edit `node_modules`, pin `cva` to a git revision, add a second lockfile, or silence errors with `as any` to get past a failure. Every removal above has a supported replacement.
