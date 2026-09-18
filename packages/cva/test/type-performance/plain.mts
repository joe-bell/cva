/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Compiled in
 * isolation against the built `packages/cva/dist` declarations — see
 * AGENTS.md's "Performance-sensitive" learnings for why. Exercises literal
 * `defaultVariants` and `VariantProps` on a plain (non-composed,
 * non-configured) component, plus `compoundVariants` with both a scalar
 * selector and an array-valued selector — `CVACompoundVariantSchema`'s
 * two-arm mapped type (`packages/cva/src/types.ts`).
 */
import { cva, type VariantProps } from "../../dist/index.mjs";

const button = cva({
  base: "button",
  variants: {
    intent: { primary: "primary", secondary: "secondary" },
    size: { sm: "sm", lg: "lg" },
  },
  compoundVariants: [
    { intent: "primary", size: "lg", class: "primary-lg" },
    { intent: "secondary", size: ["sm", "lg"], class: "secondary-any" },
  ],
  defaultVariants: { intent: "primary", size: "sm" },
});

export type ButtonProps = VariantProps<typeof button>;
export const props: ButtonProps = { intent: "secondary", size: "lg" };
