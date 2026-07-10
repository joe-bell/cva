// Regression fixture for declaration-emission (see check.mjs). Every export
// here forces `tsc --declaration` to *name* the type it came from, so a type
// that's reachable from a public signature but not exported from cva's
// `src/index.ts` surfaces as TS4023/TS4025 when this file is compiled.
import {
  compose,
  cva,
  getSchema,
  type CVAVariantShape,
  type VariantProps,
} from "cva";

// Variant-less component (the non-`CVAVariantShape` branch of `CVAComponent`).
export const box = cva({ base: "box" });

// Variants + compoundVariants + defaultVariants.
export const button = cva({
  base: "button",
  variants: {
    intent: { primary: "button--primary", secondary: "button--secondary" },
    size: { sm: "button--sm", lg: "button--lg" },
  },
  compoundVariants: [
    { intent: "primary", size: "lg", class: "button--primary-lg" },
  ],
  defaultVariants: { intent: "primary", size: "sm" },
});

// Single-component `composes` (non-array branch of `ComposedTuple`).
export const stack = cva({
  composes: button,
  variants: { gap: { none: "gap-0", md: "gap-4" } },
  defaultVariants: { gap: "none" },
});

// Array `composes` (tuple branch), composed of an already-composed component.
export const card = cva({ composes: [button, stack], base: "card" });

export type ButtonProps = VariantProps<typeof button>;
export const buttonSchema = getSchema(button);
export const cardSchema = getSchema(card);

// Deprecated API, still shipped — must still emit cleanly.
export const legacyComposed = compose(button, stack);

// A standalone variants config, typed via the exported `CVAVariantShape`
// (mirrors https://github.com/joe-bell/cva/pull/354's `ConfigSchema` use
// case: reusing a variants object, e.g. for Storybook controls, while
// keeping it type-checked against what `cva` itself accepts).
const variants = {
  tone: { light: "tone-light", dark: "tone-dark" },
} satisfies CVAVariantShape;

export const swatch = cva({ variants });
