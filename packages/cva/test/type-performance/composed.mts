/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Exercises a
 * `composes: [a, b]` tuple where the composing component locally overrides a
 * `defaultVariants` key already contributed by one of its composed
 * components, pinning that the local value wins (see `RightMerge` in
 * `packages/cva/src/config.ts`).
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
  // Local override: `tone` is redeclared even though `badge` already
  // composes it, pinning that the local `defaultVariants` wins.
  defaultVariants: { tone: "warning", size: "sm" },
});

export type PillProps = VariantProps<typeof pill>;
export const props: PillProps = {
  tone: "warning",
  weight: "thick",
  size: "lg",
};
