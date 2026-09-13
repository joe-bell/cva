import { defineConfig } from "cva/config";
import { cn as merge } from "cn";

export const { cva, cx: cn } = defineConfig({ cx: merge });
