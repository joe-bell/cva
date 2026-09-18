/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Compiled in
 * isolation against the built `packages/cva/dist` declarations — see
 * AGENTS.md's "Performance-sensitive" learnings for why. Exercises literal
 * `defaultVariants` and `VariantProps` on a plain (non-composed,
 * non-configured) component.
 */
import { cva, type VariantProps } from "../../dist/index.mjs";

const button = cva({
  base: "button",
  variants: {
    intent: { primary: "primary", secondary: "secondary" },
    size: { sm: "sm", lg: "lg" },
  },
  defaultVariants: { intent: "primary", size: "sm" },
});

export type ButtonProps = VariantProps<typeof button>;
export const props: ButtonProps = { intent: "secondary", size: "lg" };
