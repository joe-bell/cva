import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // Hand-maintained node10 `typesVersions` fallback for `./core`.
  entry: ["src/index.ts", "src/core.ts"],
});
