/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Exercises a
 * `composes: [a, b]` tuple where the composing component locally overrides a
 * `defaultVariants` key already contributed by one of its composed
 * components (`RightMerge` in `packages/cva/src/config.ts` — this fixture
 * exercises a local default override, it does not assert which value wins;
 * `VariantProps` is default-independent, so `props` below compiles either
 * way). Also exercises `compoundVariants` selecting on composed keys
 * (`tone` from `badge`, `weight` from `outline`) alongside a local key
 * (`size`), with both a scalar and an array-valued selector.
 */
import { cva, type VariantProps } from "../../dist/index.mjs";

const badge = cva({
  base: "badge",
  variants: { tone: { info: "info", warning: "warning" } },
  defaultVariants: { tone: "info" },
});

const outline = cva({
  base: "outline",
  variants: { weight: { thin: "thin", thick: "thick" } },
  defaultVariants: { weight: "thin" },
});

export const pill = cva({
  composes: [badge, outline],
  base: "pill",
  variants: { size: { sm: "sm", lg: "lg" } },
  compoundVariants: [
    { tone: "warning", weight: "thick", size: "lg", class: "loud" },
    { weight: ["thin", "thick"], size: "sm", class: "compact" },
  ],
  // Local override: `tone` is redeclared even though `badge` already
  // composes it.
  defaultVariants: { tone: "warning", size: "sm" },
});

export type PillProps = VariantProps<typeof pill>;
export const props: PillProps = {
  tone: "warning",
  weight: "thick",
  size: "lg",
};
