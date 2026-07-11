import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // `./types` is a types-only subpath; its node10 fallback
  // (`publishConfig.typesVersions`) is hand-maintained.
  entry: ["src/index.ts", "src/types.ts"],
  // Never shipped sourcemaps.
  sourcemap: false,
});
