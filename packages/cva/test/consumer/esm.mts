import { cva, type VariantProps } from "cva";
import { defineConfig } from "cva/config";
import { getSchema } from "cva/utils";

export const badge = cva({
  base: "badge",
  variants: { tone: { info: "info", warning: "warning" } },
  defaultVariants: { tone: "info" },
});
export const schema = getSchema(badge);
export type BadgeProps = VariantProps<typeof badge>;
export const configured = defineConfig({
  cx: (...values: string[]) => values.join(" "),
}).cva({ base: "configured" });
