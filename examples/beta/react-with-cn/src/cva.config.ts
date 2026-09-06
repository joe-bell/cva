import { defineConfig } from "cva/config";
import { cn as mergeClasses } from "cn";

export const { cva, cx: cn } = defineConfig({ cx: mergeClasses });
