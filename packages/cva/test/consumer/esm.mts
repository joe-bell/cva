import * as cvaRoot from "cva";
import { cva, type VariantProps } from "cva";
import { defineConfig } from "cva/config";
import { getSchema, type GetSchema } from "cva/tools";
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

// Positive side of the `--exactOptionalPropertyTypes` lane's contract
// (packages/cva/test/consumer/exact-optional.mts): every case pinned there
// as accepted under plain `--strict` must actually compile — and run —
// here, since this file is the lane that runs without that flag.
export const optionalProps = cva({
  base: "optional",
  variants: { intent: { primary: "primary", secondary: "secondary" } },
  compoundVariants: [{ intent: undefined, class: "loud" }],
  defaultVariants: { intent: undefined },
});
export const withUndefinedVariant = optionalProps({ intent: undefined });
export const withUndefinedClass = optionalProps({ class: undefined });
export const withUndefinedClassName = optionalProps({
  class: "x",
  className: undefined,
});

assert.equal(badge(), "badge info");
assert.equal(badge({ tone: "info" }), "badge info");
assert.equal(badge({ tone: "warning" }), "badge warning");
assert.deepEqual(schema, {
  tone: { values: ["info", "warning"], defaultValue: "info" },
});
assert.equal(pill(), "badge info pill sm");
assert.equal(pill({ tone: "warning" }), "badge warning pill sm loud");
assert.equal(configured(), "configured");
assert.equal(withUndefinedVariant, "optional loud");
assert.equal(withUndefinedClass, "optional loud");
assert.equal(withUndefinedClassName, "optional loud x");
// The published root entry is the clsx preset and nothing else.
assert.deepEqual(Object.keys(cvaRoot).sort(), ["cva", "cx"]);
