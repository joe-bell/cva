import { defineConfig } from "cva/core";
import { cn } from "cn";

// `cn` bundles clsx and tailwind-merge, and its input type matches cva's,
// so object and array authoring stay available alongside conflict resolution.
const { cva, cx } = defineConfig({ cx: cn });

export { cva, cx as cn };
