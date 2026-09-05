import { defineConfig } from "cva/config";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const { cva, cx } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
