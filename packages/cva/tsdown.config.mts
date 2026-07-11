import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // `./core` is the unconfigured engine (`defineConfig` with a required
  // `cx` concatenator); its node10 fallback (`publishConfig.typesVersions`)
  // is hand-maintained.
  entry: ["src/index.ts", "src/core.ts"],
});
