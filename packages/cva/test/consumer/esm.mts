import * as cvaRoot from "cva";
import { cva, type VariantProps } from "cva";
import { defineConfig } from "cva/config";
import { getSchema, type GetSchema } from "cva/tools";
import { getSchema as getSchemaFromUtils } from "cva/utils";
import assert from "node:assert/strict";

export const badge = cva({
  base: "badge",
  variants: { tone: { info: "info", warning: "warning" } },
  defaultVariants: { tone: "info" },
});
export const schema = getSchema(badge);
export const readSchema: GetSchema = getSchema;
export type BadgeProps = VariantProps<typeof badge>;
export interface BadgeUi extends VariantProps<typeof badge> {
  children?: string;
}
export const pill = cva({
  composes: [badge],
  base: "pill",
  variants: { size: { sm: "sm", lg: "lg" } },
  compoundVariants: [{ tone: "warning", size: ["sm", "lg"], class: "loud" }],
  defaultVariants: { size: "sm" },
});
export const configured = defineConfig({
  cx: (...values: string[]) => values.join(" "),
}).cva({ base: "configured" });

assert.equal(badge(), "badge info");
assert.equal(badge({ tone: "info" }), "badge info");
assert.equal(badge({ tone: "warning" }), "badge warning");
assert.deepEqual(schema, {
  tone: { values: ["info", "warning"], defaultValue: "info" },
});
assert.equal(pill(), "badge info pill sm");
assert.equal(pill({ tone: "warning" }), "badge warning pill sm loud");
assert.equal(configured(), "configured");
// The published root entry is the clsx preset and nothing else.
assert.deepEqual(Object.keys(cvaRoot).sort(), ["cva", "cx"]);
assert.equal(getSchemaFromUtils, getSchema);
assert.deepEqual(getSchemaFromUtils(badge), schema);
