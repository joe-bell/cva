---
name: cva-best-practices
description: Build and review typed component variants with cva. Use when defining cva components, exposing variant props, composing styles, handling class conflicts, or generating variant galleries. For version upgrades, use migration guidance instead.
---

# CVA best practices

Use the project's styling approach and component conventions. Apply the guidance below to the requested component rather than refactoring unrelated code. The [beta docs](https://cva.style/beta/) are the source of truth for these recommendations.

## Check the installed package

Read the consuming package's manifest, lockfile, and existing imports before choosing an API. `cva@1.0.0-beta` and `class-variance-authority@0.x` are different packages. Beta releases can change without semver guarantees; verify the installed exports and types when an API below is unavailable. Do not upgrade dependencies as part of ordinary component work.

These examples target `cva@1.0.0-beta.12`: the single-object `cva` call, `composes`, `defineConfig` from `cva/config`, and `getSchema` from `cva/tools`. Older betas may have different entry points or APIs. For stable `class-variance-authority`, follow the [stable docs](https://cva.style/): import from `class-variance-authority` and use `cva(base, options)`. Do not apply beta-only configuration, composition, schema, or Tailwind CSS exports to stable projects. When an upgrade is requested, consult the release-specific migration guidance instead.

## Define variants once

- Define a class function outside the component render body. Put invariant classes in `base`, independent choices in `variants`, and combinations in `compoundVariants`.
- Put shared defaults in `defaultVariants`. Omitted props and `undefined` use those defaults; forward optional props from wrappers rather than duplicating defaults there.
- To select no classes for a variant, declare a named option such as `unset: null`, then pass `"unset"`. Do not assume passing `null` disables a beta variant.
- Treat the configuration and referenced objects as immutable after creating a class function. Create another function if the configuration changes.
- Prefer server-side rendering or static generation for static components when the framework permits it. Do not add client-side JavaScript solely to generate a static class string.

See [Variants](https://cva.style/beta/getting-started/variants/) and the [API reference](https://cva.style/beta/api-reference/).

## Keep props inferred

Use `VariantProps<typeof button>` rather than repeating variant unions. It contains public variant props, not `class` or `className`, and omits variant names prefixed with `_`. Internal variants still work in defaults, compound variants, and direct calls; they are not a runtime access-control mechanism.

For a React wrapper, combine variant types with native element props and forward `className` to the class function. If names overlap incompatibly, omit the overlapping native props before combining them. Forward semantic props such as `disabled` to the actual HTML element as well as the class function. Use TypeScript's `Required<Pick<...>>` and `Omit` when a public variant must be required.

See [TypeScript](https://cva.style/beta/getting-started/typescript/) and the [React gallery](https://cva.style/beta/getting-started/tools/#generate-a-react-variant-gallery).

## Join classes without another dependency

The preset exports `cx`, backed by `clsx`, for strings, nested arrays, and conditional objects. Use it instead of adding `clsx` or `classnames` for ordinary conditional class joining. `cx` does not deduplicate classes or resolve CSS conflicts.

Pass extra classes through the class function's `class` or `className` prop. Appending a utility does not guarantee a CSS override. For Tailwind CSS, follow the project's existing conflict strategy:

- **`cn`**: configure `defineConfig({ cx: merge })`, importing `cn` as `merge` from `cn`.
- **`cva/tailwindcss`**: import after Tailwind CSS and use `base:` for overridable defaults. Ordinary utilities override them through the cascade. Keep state styles ordinary; any ordinary utility also beats conditional `base:` defaults. Put `base:` before pseudo-element variants, and remember important declarations reverse layer priority.
- **`tailwind-merge`**: combine its `twMerge` with the preset `cx` to preserve conditional objects. Bare `twMerge` has a narrower input grammar.

For the last option:

```ts
import { cx as joinClasses } from "cva";
import { defineConfig } from "cva/config";
import { twMerge } from "tailwind-merge";

export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(joinClasses(...inputs)),
});
```

Import the configured functions throughout that project. Do not accidentally use the preset for components expected to merge conflicts. A custom concatenator owns the input grammar and must support empty calls, variadic inputs, and composed strings.

See [Installation](https://cva.style/beta/getting-started/installation/) and [Extending Components](https://cva.style/beta/getting-started/extending-components/).

## Compose classes and preserve semantics

Use `composes` for reusable CVA class functions. Pass one function or an inline array; use `as const` for a stored array to retain tuple inference. Overlapping variant values add each component's matching classes. Defaults merge with the last composed default winning, then local defaults take precedence across the composition.

A CVA class function produces a string, so apply it to the appropriate HTML element. For a React render-prop API, the docs recommend Base UI's `useRender`; do not invent a CVA `styled` API. For compound component styling, consider the CSS cascade, custom properties, and selectors such as `:has()` before introducing JavaScript state solely to share styles.

CVA does not interpret responsive variant objects. Express responsive styles in your CSS, define a named variant with breakpoint utilities, or show/hide variants at breakpoints as appropriate for the existing UI.

See [Composing Components](https://cva.style/beta/getting-started/composing-components/), [Compound Components](https://cva.style/beta/getting-started/compound-components/), [Polymorphism](https://cva.style/beta/getting-started/polymorphism/), and [FAQs](https://cva.style/beta/faqs/).

## Generate galleries from the schema

Call `getSchema` on the CVA class function, not its React or other framework wrapper. Read the schema outside rendering and iterate typed `values` to generate galleries, documentation, or controls without duplicate lists. Boolean and numeric values retain their types; internal and empty variants are omitted. `defaultValue` is present only when that variant has a declared default.

Keep an omitted-prop case when demonstrating defaults. Derive table spans from the displayed array lengths so adding variant values does not break the gallery. Put schema consumers in stories or documentation when the application does not need them at runtime.

See [Tools](https://cva.style/beta/getting-started/tools/). Verify changed class outputs against the installed package and type-check consuming components using the project's checks.
