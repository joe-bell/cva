// Schema inference preserves the literal default.
import { cva } from "../../dist/index.mjs";
import { getSchema } from "../../dist/tools.mjs";

const badge = cva({
  base: "badge",
  variants: { tone: { info: "info", warning: "warning" } },
  defaultVariants: { tone: "info" },
});

export const schema = getSchema(badge);
export const defaultTone: "info" = schema.tone.defaultValue;
