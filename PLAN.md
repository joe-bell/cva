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

**Status:** Implemented. The guard issue is resolved by the completed `composes` work below;
`getSchema` itself was intentionally left unchanged.

---

## Remaining

### Phase 5 — Explore separate entry point for `getSchema`

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

## Out of scope

- Removing `compose` (deprecation only, no breaking change)
- Changing `GetSchema` (it already works once the return type is `CVAComponent`)
- Changing `defineConfig` return shape (it still returns `compose` for backwards compat)
- Updating the `latest` docs site (covers the pre-`compose` v0 API)

---

## Completed

### Phase 1 — Type changes (`packages/cva/src/index.ts`)

- Added `MergedVariants` / `MergedDefaultVariants` helpers in the utils section for use by `CVA`.
- Added `composes` support to `CVAComponentConfig`.
- Added composed variant/defaultVariant merging to the `CVA` return type.
- Supported both single-component and multi-component forms:
  - `composes: component`
  - `composes: [component, otherComponent]`
- Deprecated `Compose` with JSDoc while leaving the interface/runtime behaviour untouched.
- Updated `cva` runtime behaviour:
  - normalizes `config.composes` to an array internally;
  - strips `class` / `className` before calling composed components;
  - merges composed output with the component's own output via `cx`;
  - derives `component.config` with merged composed `variants` and `defaultVariants` so `getSchema` can introspect composed components.

### Phase 2 — Tests (`packages/cva/src/index.test.ts`)

- Added `describe("cva — composes")` coverage.
- Added coverage for `composes: component`.
- Added coverage for `composes: [box, stack]` matching existing `compose` behaviour.
- Added coverage for local variants layered alongside `composes`.
- Updated the composed `getSchema` test to use `cva({ composes: [...] })`.
- Added `getSchema` coverage for the single-component `composes` form.
- Fixed the composed schema type assertion.

### Phase 3 — Docs

- Updated `docs/beta/src/content/docs/getting-started/composing-components.mdx`:
  - leads with the `composes` key as the primary approach;
  - documents both `composes: component` and `composes: [component, otherComponent]`;
  - includes a deprecation callout for the old `compose(box, root)` form.
- Updated `docs/beta/src/content/docs/getting-started/whats-new.mdx`:
  - lists `composes` as the new feature;
  - makes clear that `composes` replaces the `compose` function;
  - adds a **Deprecations** section for `compose` → `composes`;
  - links to the composing-components page and migration examples.

### Phase 4 — Manual code & type cleanup

- Confirmed the actual package diagnostics are clean for:
  - `packages/cva/src/index.ts`
  - `packages/cva/src/index.test.ts`
- Confirmed package typecheck passes with `pnpm --filter cva check:tsc`.
- Confirmed targeted tests pass with `pnpm vitest --config .config/vitest.config.ts run packages/cva/src/index.test.ts`.
- Ran Prettier on touched implementation, tests, and docs.
- Confirmed the remaining project-wide diagnostics are from an example app's `node_modules/cva` copy/symlink rather than the edited package files.

### Files changed

| File                                                                  | Change                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cva/src/index.ts`                                           | Add composition helpers; add `composes` support to `CVAComponentConfig` and `CVA`; support single and array forms; update runtime `cva` to merge composed configs; add `@deprecated` to `Compose` |
| `packages/cva/src/index.test.ts`                                      | Add `describe("cva — composes")` tests; cover single and array `composes`; update `getSchema` composed tests                                                                                      |
| `docs/beta/src/content/docs/getting-started/composing-components.mdx` | Rewrite to lead with `composes`; document single and array forms; add deprecation callout for `compose`                                                                                           |
| `docs/beta/src/content/docs/getting-started/whats-new.mdx`            | Add `composes` feature entry; clarify it replaces `compose`; add Deprecations section with before/after diff                                                                                      |
