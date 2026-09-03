import { defineConfig } from "cva/core";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// `clsx` resolves cva inputs; `tailwind-merge` resolves conflicts, like
// shadcn/ui's `cn` helper.
// https://ui.shadcn.com/docs/installation/manual#add-a-cn-helper
export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
