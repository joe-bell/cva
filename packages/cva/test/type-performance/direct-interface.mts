/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Exercises
 * `interface X extends VariantProps<typeof y>`, matching the pattern pinned
 * at `packages/cva/test/consumer/esm.mts`.
 */
import { cva, type VariantProps } from "../../dist/index.mjs";

const badge = cva({
  base: "badge",
  variants: { tone: { info: "info", warning: "warning" } },
  defaultVariants: { tone: "info" },
});

export interface BadgeProps extends VariantProps<typeof badge> {
  children?: string;
}

export const props: BadgeProps = { tone: "warning", children: "Hi" };
