> **Warning**
>
> This package is experimental, please use `class-variance-authority` until stable.

---

# cva

For documentation, visit [cva.style](https://cva.style).

---

## `class-variance-authority` → `cva`

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
