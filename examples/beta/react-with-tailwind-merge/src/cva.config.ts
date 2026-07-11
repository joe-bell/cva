import { defineConfig } from "cva/core";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// The shadcn/ui `cn` pattern, wired into `cva` as the class name
// concatenator: `clsx` resolves cva's full authoring grammar (arrays,
// objects, conditionals), then `tailwind-merge` dedupes any conflicting
// Tailwind utilities so the last one wins.
export const { cva, cx } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
