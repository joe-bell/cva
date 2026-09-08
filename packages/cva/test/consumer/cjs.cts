import { cva, type VariantProps } from "cva";
import { defineConfig } from "cva/config";
import { getSchema } from "cva/utils";
import assert from "node:assert/strict";

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

assert.equal(badge(), "badge info");
assert.equal(badge({ tone: "info" }), "badge info");
assert.equal(badge({ tone: "warning" }), "badge warning");
assert.deepEqual(schema, {
  tone: { values: ["info", "warning"], defaultValue: "info" },
});
assert.equal(configured(), "configured");
