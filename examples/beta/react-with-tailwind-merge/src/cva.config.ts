import { defineConfig } from "cva/core";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const { cva, cx } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
