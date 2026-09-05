import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // Hand-maintained node10 `typesVersions` fallbacks cover these subpaths.
  entry: ["src/index.ts", "src/config.ts", "src/utils.ts"],
});
