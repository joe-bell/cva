// Literal defaults and scalar/array compound selectors.
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
