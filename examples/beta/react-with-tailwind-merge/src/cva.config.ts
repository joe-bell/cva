import { defineConfig } from "cva/config";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(clsx(inputs)),
});
