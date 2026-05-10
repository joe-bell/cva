# Plan: `composes` key for `cva` + deprecate `compose`

## Problem

`getSchema` has a guard:
```ts
Component extends ReturnType<CVA> ? { config: CVAComponentConfig<Config, Variants> } : never
```
The return type of the current `compose` function is a bare function — no `.config` — so it
doesn't extend `ReturnType<CVA>` and the guard collapses to `never`. Any attempt to fix
`Compose`'s return type hits a wall in the implementation because the runtime `reduce`-built
config can't satisfy the new type without a cast (`as any`), which is unacceptable.

## Solution

Move composition into `cva` itself as a `composes` key. The result of
`cva({ composes: [...] })` is always a `CVAComponent` — `GetSchema` needs zero changes
and the guard never misfires.

Deprecate (but do not remove) the existing `compose` function, leaving its types and runtime
behaviour untouched.

---

## Phase 1 — Type changes (`packages/cva/src/index.ts`)

### 1. Keep (and clean up) `MergedVariants` / `MergedDefaultVariants`

These helpers are still needed, now used inside `CVA` instead of `Compose`.
Move them out of the compose section and into the utils section.

```ts
type MergedVariants<T extends ReturnType<CVA>[]> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends {
      config: { variants?: infer V extends CVAVariantShape };
    }
      ? V
      : never;
  }[number]
>;

type MergedDefaultVariants<T extends ReturnType<CVA>[]> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends { config: { defaultVariants?: infer D } }
      ? NonNullable<D>
      : never;
  }[number]
>;
```

### 2. Add `composes` to `CVAComponentConfig`

Add an optional `composes` key. The constraint `ReturnType<CVA>[]` is intentionally broad
here — the precise merging is expressed in the `CVA` return type.

```ts
type CVAComponentConfig<Config, Variants, Composed extends ReturnType<CVA>[] = []> =
  Config & { composes?: [...Composed] } &
  (Variants extends CVAVariantShape
    ? CVAComponentConfigBase & { ... }   // existing branches unchanged
    : CVAComponentConfigBase & { ... });
```

### 3. Add `Composed` type parameter to `CVA`

```ts
export interface CVA {
  <_ extends InternalOnlyWarning, Config, Variants, Composed extends ReturnType<CVA>[] = []>(
    config: CVAComponentConfig<Config, Variants, Composed>,
  ): CVAComponent<
    Config & { defaultVariants: Config["defaultVariants"] & MergedDefaultVariants<Composed> },
    Variants & MergedVariants<Composed>
  >;
}
```

This means the return is always a `CVAComponent` — `getSchema` just works, no guard changes.

### 4. Deprecate `compose`

Leave `Compose` interface and runtime implementation untouched. Add a JSDoc `@deprecated`:

```ts
/**
 * @deprecated Use the `composes` key inside `cva` instead.
 * @example
 * // Before
 * const card = compose(box, stack)
 * // After
 * const card = cva({ composes: [box, stack] })
 */
export interface Compose { ... }
```

### 5. Update `cva` runtime implementation

Two things change at runtime:

**a) Call-time behaviour** — when `config.composes` is present, call each composed
component with the variant props (stripping `class`/`className`, mirroring what
`compose` does today) and merge their outputs via `cx` alongside the component's own
output.

**b) `component.config` must be a derived merged object**, not the raw `config`. If
`component.config` is just the raw config, `getSchema` will only see the variants
declared directly in that `cva` call — the composed components' variants and
defaultVariants will be invisible. The implementation must set:

```ts
component.config = {
  ...config,
  variants: { ...mergedVariantsFromComposed, ...config.variants },
  defaultVariants: { ...mergedDefaultVariantsFromComposed, ...config.defaultVariants },
};
```

**c) Cast strategy** — the derived `component.config` won't match `typeof config`,
so a cast is needed on the return. Try the direct form first:

```ts
return component as ReturnType<CVA>;
```

Only fall back to `as unknown as ReturnType<CVA>` if TypeScript rejects the direct
cast for insufficient overlap.

---

## Phase 2 — Tests (`packages/cva/src/index.test.ts`)

### New `describe("cva — composes")` block

Mirror the existing `describe("compose")` tests so behaviour is proven equivalent.

**Test: should merge into a single component**
Based directly on the existing compose test. Same `box` + `stack` components, same
runtime assertions, same type assertions — just using `cva({ composes: [box, stack] })`
instead of `compose(box, stack)`.

```ts
const card = cva({ composes: [box, stack] });

expectTypeOf(card).toBeFunction();
expectTypeOf(card).parameter(0).toMatchTypeOf<
  | { shadow?: "sm" | "md" | undefined; gap?: "unset" | 1 | 2 | 3 | undefined }
  | undefined
>();

expect(card()).toBe("shadow-sm");
expect(card({ class: "adhoc-class" })).toBe("shadow-sm adhoc-class");
expect(card({ className: "adhoc-class" })).toBe("shadow-sm adhoc-class");
expect(card({ shadow: "md" })).toBe("shadow-md");
expect(card({ gap: 2 })).toBe("shadow-sm gap-2");
expect(card({ shadow: "md", gap: 3, class: "adhoc-class" })).toBe("shadow-md gap-3 adhoc-class");
expect(card({ shadow: "md", gap: 3, className: "adhoc-class" })).toBe("shadow-md gap-3 adhoc-class");
```

**Test: should support additional variants alongside composes**
Proves you can layer new variants on top of composed ones in a single call.

```ts
const card = cva({
  composes: [box, stack],
  variants: {
    rounded: { sm: "rounded-sm", lg: "rounded-lg" },
  },
  defaultVariants: { rounded: "sm" },
});

expectTypeOf(card).parameter(0).toMatchTypeOf<
  | {
      shadow?: "sm" | "md" | undefined;
      gap?: "unset" | 1 | 2 | 3 | undefined;
      rounded?: "sm" | "lg" | undefined;
    }
  | undefined
>();

expect(card()).toBe("shadow-sm rounded-sm");
expect(card({ rounded: "lg" })).toBe("shadow-sm rounded-lg");
expect(card({ shadow: "md", gap: 2, rounded: "lg" })).toBe("shadow-md gap-2 rounded-lg");
```

### Update `describe("getSchema")` — "should return the schema for a composed component"

Replace the `compose`-based test with the `cva({ composes: [...] })` form, and fix the
type assertion (shadow was missing `defaultValue`, gap values should be number literals):

```ts
const card = cva({ composes: [box, stack] });
const schema = getSchema(card); // no @ts-expect-error needed

expect(schema).toStrictEqual({
  shadow: { values: ["sm", "md"], defaultValue: "sm" },
  gap: { values: ["1", "2", "3", "unset"], defaultValue: "unset" },
});

expectTypeOf(schema).toEqualTypeOf<{
  shadow: { values: readonly ("sm" | "md")[]; defaultValue: "sm" };
  gap: { values: readonly ("unset" | 1 | 2 | 3)[]; defaultValue: "unset" };
}>();
```

---

## Phase 3 — Docs

The `latest` site covers the old `class-variance-authority@0.*` API and doesn't mention
`compose` at all — no changes needed there.

The `beta` site is the active docs. Two files need updating:

### `docs/beta/src/content/docs/getting-started/composing-components.mdx`

- Lead with the new `composes` key as the primary approach, using the same `box` + `root`
  example that's already there.
- Add a deprecation callout below showing the old `compose(box, root)` form and pointing
  users to migrate.

### `docs/beta/src/content/docs/getting-started/whats-new.mdx`

This file is the migration guide (covers what changed from `class-variance-authority@0.*`
to `cva@beta`). Add a new **Deprecations** section:

- `compose` is deprecated in favour of the `composes` key inside `cva`.
- Show the before/after diff.
- Link to the updated composing-components page.

---

## Phase 4 — Manual code & type cleanup

After all implementation and tests pass, do a sweep for:

- Any leftover `@ts-expect-error` comments in `index.test.ts` that are no longer needed
- The `MergedVariants` / `MergedDefaultVariants` types added earlier in the branch (now in
  the compose section) — consolidate into the utils section and remove duplicates
- The partial `Compose` interface changes made earlier in the branch — revert to the
  original untouched interface since we're only deprecating it, not changing its types
- Any stray TODO comments or dead code introduced during exploration

---

## Phase 5 — Explore separate entry point for `getSchema`

`getSchema` is a specialised introspection utility, not part of the core `cva`/`cx`/`compose`
API. Investigate whether it should live in its own entry point (e.g. `cva/schema` or
`cva/introspect`) so it can be tree-shaken from production bundles by consumers who don't
need it.

Questions to answer:
- How is the package currently structured (exports in `package.json`, build config)?
- Would a subpath export be straightforward to add without breaking existing imports?
- Are there type-only implications (the `GetSchema` interface is exported)?
- What's the right name: `cva/schema`, `cva/introspect`, something else?

This phase is **exploration only** — no implementation until the findings are reviewed.

---

## Files changed

| File | Change |
|------|--------|
| `packages/cva/src/index.ts` | Add `MergedVariants`/`MergedDefaultVariants` helpers; add `Composed` param to `CVAComponentConfig` and `CVA`; update runtime `cva` to merge composed configs; add `@deprecated` to `Compose` |
| `packages/cva/src/index.test.ts` | Add `describe("cva — composes")` tests; update `getSchema` composed test to use new API and fix type assertion |
| `docs/beta/src/content/docs/getting-started/composing-components.mdx` | Rewrite to lead with `composes` key; add deprecation callout for `compose` |
| `docs/beta/src/content/docs/getting-started/whats-new.mdx` | Add Deprecations section: `compose` → `composes` with before/after diff |

## Out of scope

- Removing `compose` (deprecation only, no breaking change)
- Changing `GetSchema` (it already works once the return type is `CVAComponent`)
- Changing `defineConfig` return shape (it still returns `compose` for backwards compat)
- Updating the `latest` docs site (covers the pre-`compose` v0 API)
