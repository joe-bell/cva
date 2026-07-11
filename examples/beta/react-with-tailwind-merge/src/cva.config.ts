import { defineConfig } from "cva/core";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui's `cn` helper, wired into `cva` as the class name
// concatenator: `clsx` resolves cva's full authoring grammar (arrays,
// objects, conditionals), then `tailwind-merge` dedupes any conflicting
// Tailwind utilities so the last one wins. Re-exported as `cn` for parity.
// https://ui.shadcn.com/docs/installation/manual#add-a-cn-helper
export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
