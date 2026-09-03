import { defineConfig } from "cva/core";
import { cn } from "cn";

// `cn` resolves conditional classes and Tailwind conflicts in one function,
// an alternative to composing `clsx` with `tailwind-merge`. Its input type
// matches cva's, so object and array authoring stay available.
const { cva, cx } = defineConfig({ cx: cn });

export { cva, cx as cn };
