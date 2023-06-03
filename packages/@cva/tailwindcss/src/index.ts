import { defineConfig } from "cva";
import { twMerge } from "tailwind-merge";

export const { cx, cva } = defineConfig({
  hooks: {
    "cx:done": (className) => twMerge(className),
  },
});
