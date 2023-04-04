> **Warning**
>
> This package is experimental, please use `class-variance-authority` until stable.

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

2. **Use `"unset"` to disable a variant completely**

   Previously, passing `null` to a variant would provide the same behaviour – to match Stitches.js – however this caused some [concern and confusion](https://github.com/joe-bell/cva/discussions/97).

   Instead, a more explicit `"unset"` option ([similar to the CSS keyword](https://developer.mozilla.org/en-US/docs/Web/CSS/unset)) is now available for use.

3. Utilize `swc` minification to improve bundlesize

   > **Warning**
   >
   > Size may differ before stable release

4. Warns against passing generic type parameters into `cva`. This wasn't supported originally, but the API wasn't exactly clear.

### API Reference

#### `cva`

Builds a `cva` component

```ts
const component = cva(options);
```

##### Parameters

1. `options`
   - `base`: the base class name (`string`, `string[]` or `null`)
   - `variants`: your variants schema
   - `compoundVariants`: variants based on a combination of previously defined variants
   - `defaultVariants`: set default values for previously defined variants.  
     _note: these default values can be removed completely by setting the variant as `"unset"`_
