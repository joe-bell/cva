// Composed variants, a local default override, and scalar/array compounds.
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
  defaultVariants: { tone: "warning", size: "sm" },
});

export type PillProps = VariantProps<typeof pill>;
export const props: PillProps = {
  tone: "warning",
  weight: "thick",
  size: "lg",
};
