import { defineConfig } from "cva/config";
import { cx as joinClasses } from "cva";
import { twMerge } from "tailwind-merge";

export const { cva, cx: cn } = defineConfig({
  cx: (...inputs) => twMerge(joinClasses(...inputs)),
});
