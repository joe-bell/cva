// Shared options and their rationale live in `.config/tsdown.base.mts`;
// only this package's deltas are configured here.
import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  entry: ["src/index.ts"],
  sourcemap: true,
  // `typescript` is an optional peer used only at the type level (never
  // imported at runtime), so the unused check can't see it.
  unused: { level: "error", ignore: ["typescript"] },
});
