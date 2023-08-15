> **Warning**
>
> This package is experimental, and not ready for use.
>
> Please use `class-variance-authority` until stable.

---

# cva

For documentation, visit [cva.style](https://cva.style).

---

## `class-variance-authority` → `cva`

### Changelog

1. **`cva` accepts a single parameter**

   Base styles (whether `string` or `string[]`) are now applied via the named `base` property

   - _Before_

     ```ts
     import { cva } from "class-variance-authority";

     const before = cva("your-base-class");
     ```

   - _After_

     ```ts
     import { cva } from "cva";

     const after = cva({ base: "your-base-class" });
     ```

2. **Roll-your-own `"unset"` to disable a variant completely**

   Previously, passing `null` to a variant would disable a variant completely – to match Stitches.js – however this caused some [concern and confusion](https://github.com/joe-bell/cva/discussions/97).

   Instead, we recommend setting an explicit `"unset"` option ([similar to the CSS keyword](https://developer.mozilla.org/en-US/docs/Web/CSS/unset)) within your variant:

   ```ts
   import { cva } from "cva";

   const button = cva({
     base: "button",
     variants: {
       intent: {
         unset: null,
         primary: "button--primary",
         secondary: "button--secondary",
       },
     },
   });

   button({ intent: "unset" });
   // => "button"
   ```

3. **Utilize `swc` minification to improve bundlesize**

   > **Warning**
   >
   > Size may differ before stable release

4. Warns against passing generic type parameters into `cva`. This wasn't supported originally, but the API wasn't exactly clear.

5. **New `defineConfig` API**

6. **New `@cva/tailwindcss` package**

7. **New `compose` API**

### API Reference

#### `cva`

Builds a `cva` component

```ts
import { cva } from "cva";

const component = cva(options);
```

##### Parameters

1. `options`
   - `base`: the base class name (`string`, `string[]` or other [`clsx` value](https://github.com/lukeed/clsx#input))
   - `variants`: your variants schema
   - `compoundVariants`: variants based on a combination of previously defined variants
   - `defaultVariants`: set default values for previously defined variants.  
     _note: these default values can be removed completely by setting the variant as `"unset"`_

#### `compose`

Shallow merges any number of `cva` components into a single component.

```ts
import { compose } from "cva";

const composedComponent = compose(options);
```

##### Parameters

`options`: array of `cva` components

#### `defineConfig`

Generate `cx` and `cva` functions based on your preferred configuration.

Store in a `cva.config.ts` file, and import across your project.

```ts
import { cva } from "cva";

// cva.config.ts
export const { cva, cx } = defineConfig(options);
```

1. `options`
   - `hooks`
     - `cx:done`: returns a concatenated class string of all `cx` contents (also used internally by `cva`)

### Composing Components

Any number of `cva` components can be shallow merged into a single component via the `compose` method:

```ts
// components/card.ts
import { cva, compose } from "cva";

const box = cva({
  base: ["box", "box-border"],
  variants: {
    margin: { 0: "m-0", 2: "m-2", 4: "m-4", 8: "m-8" },
    padding: { 0: "p-0", 2: "p-2", 4: "p-4", 8: "p-8" },
  },
  defaultVariants: {
    margin: 0,
    padding: 0,
  },
});

const root = cva({
  base: ["card", "border-solid", "border-slate-300", "rounded"],
  variants: {
    shadow: {
      md: "drop-shadow-md",
      lg: "drop-shadow-lg",
      xl: "drop-shadow-xl",
    },
  },
});

export interface CardProps extends VariantProps<typeof card> {}
export const card = compose(box, root);

card({ margin: 2, shadow: "md" });
// => "box box-border m-2 card border-solid border-slate-300 rounded drop-shadow-md"
card({ margin: 2, shadow: "md", class: "adhoc-class" });
// => "box box-border m-2 card border-solid border-slate-300 rounded drop-shadow-md adhoc-class"
```
