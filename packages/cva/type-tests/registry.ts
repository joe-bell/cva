/**
 * Isolated compile-time test for `CVARegistry` augmentation (run via
 * `pnpm --filter cva check:registry`).
 *
 * This cannot live in the main test suite: module augmentation applies to
 * the whole TypeScript program, so registering a narrowed `classValue` here
 * would rewrite the authoring types for every other test file too. This
 * fixture compiles under its own tsconfig instead, with the package's name
 * mapped to source so the augmentation reads exactly like consumer code.
 */
import { twMerge, type ClassNameValue } from "tailwind-merge";
import { defineConfig } from "cva/core";

declare module "cva/core" {
  interface CVARegistry {
    classValue: ClassNameValue;
  }
}

// With the registry narrowed to tailwind-merge's own input type, a bare
// `twMerge` satisfies the `cx` contract — no cast, no wrapper.
const { cva, cx } = defineConfig({ cx: twMerge });

// String and (nested) array authoring — tailwind-merge's grammar — compiles.
export const button = cva({
  base: ["font-semibold", ["bg-gray-200"]],
  variants: {
    intent: { primary: "bg-blue-500", secondary: "bg-white" },
  },
  defaultVariants: { intent: "primary" },
});

export const buttonClassName = button({
  intent: "primary",
  class: ["bg-red-500"],
});

export const merged = cx("bg-gray-200", ["bg-blue-500"], null, undefined);

// The authoring surface is narrowed project-wide: object syntax (not part
// of `ClassNameValue`) is now a compile error everywhere.
cva({
  // @ts-expect-error — objects aren't part of tailwind-merge's ClassNameValue
  base: { "bg-gray-200": true },
});

cva({
  // @ts-expect-error — object-syntax variant values are rejected too (the
  // shape no longer satisfies the narrowed `CVAVariantShape`)
  variants: {
    intent: {
      primary: { "bg-blue-500": true },
    },
  },
});

// @ts-expect-error — and so are object-syntax class props
button({ class: { "bg-red-500": true } });

// @ts-expect-error — numbers (other than 0) aren't part of ClassNameValue
cx(1);
