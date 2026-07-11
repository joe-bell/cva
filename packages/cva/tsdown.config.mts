import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  entry: ["src/index.ts"],
});
