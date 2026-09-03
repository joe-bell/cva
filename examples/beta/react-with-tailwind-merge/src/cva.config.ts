import { defineConfig } from "cva/core";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// `clsx` resolves cva's authoring grammar; `tailwind-merge` resolves Tailwind
// conflicts. This is the pattern behind shadcn/ui's `cn` helper:
// https://ui.shadcn.com/docs/installation/manual#add-a-cn-helper
export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
