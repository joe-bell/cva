// A consumer interface extending inferred variant props.
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
