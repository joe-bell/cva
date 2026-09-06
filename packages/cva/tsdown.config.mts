import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // Hand-maintained node10 `typesVersions` fallbacks cover these subpaths.
  entry: ["src/index.ts", "src/config.ts", "src/utils.ts"],
  copy: [{ from: "src/tailwindcss.css", to: "dist" }],
  exports: {
    devExports: true,
    customExports(exports, { isPublish }) {
      return {
        ...exports,
        "./tailwindcss": isPublish
          ? "./dist/tailwindcss.css"
          : "./src/tailwindcss.css",
      };
    },
  },
  // Tailwind's stylesheet resolver consumes this CSS-only entry.
  attw: {
    ...base.attw,
    excludeEntrypoints: ["./tailwindcss"],
  },
});
