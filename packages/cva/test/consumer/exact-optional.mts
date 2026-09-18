import { cva, type VariantProps } from "cva";
import { defineConfig } from "cva/config";
import { twMerge } from "tailwind-merge";

const button = cva({
  base: "button",
  variants: { intent: { primary: "primary", secondary: "secondary" } },
  compoundVariants: [{ intent: undefined, class: "loud" }],
  defaultVariants: { intent: undefined },
});

export const withUndefinedVariant = button({ intent: undefined });
export const withUndefinedClass = button({ class: undefined });
// `className?: never` (`CVAClassProp` in `packages/cva/src/types.ts`) only
// admits an explicit `undefined` because the optional modifier widens it —
// `exactOptionalPropertyTypes` disables that widening, so this is rejected
// here even though it compiles fine under plain `--strict`.
// @ts-expect-error: `className` and `class` can't both be provided.
export const withUndefinedClassName = button({
  class: "x",
  className: undefined,
});

const { cva: twCva } = defineConfig({ cx: twMerge });
const twButton = twCva({
  base: "button",
  variants: { intent: { primary: "primary", secondary: "secondary" } },
});
export const twProps: VariantProps<typeof twButton> = { intent: "primary" };
export const twClassName = twButton({ intent: "primary" });
