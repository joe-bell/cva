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
