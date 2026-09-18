/**
 * Fixture for `test/bench/scripts/type-performance.ts`. Exercises
 * `defineConfig({ cx: twMerge })`, which narrows the authoring surface to
 * `tailwind-merge`'s own `ClassNameValue` grammar (see
 * `packages/cva/src/config.test.ts`'s "tailwind-merge" suite).
 */
import { defineConfig } from "../../dist/config.mjs";
import { twMerge } from "tailwind-merge";

const { cva } = defineConfig({ cx: twMerge });

export const button = cva({
  base: "px-2 py-1",
  variants: {
    intent: { primary: "bg-blue-500", secondary: "bg-gray-500" },
  },
  defaultVariants: { intent: "primary" },
});

export const className = button({ intent: "secondary" });
