// Shared options and their rationale live in `.config/tsdown.base.mts`;
// only this package's deltas are configured here. No `sourcemap` override:
// the package has never shipped sourcemaps, and one manifest field is
// hand-maintained - `publishConfig.typesVersions`, the node10 fallback for
// the `./types` subpath, which tsdown preserves but doesn't generate.
import { defineConfig } from "tsdown";
import { base } from "../../.config/tsdown.base.mts";

export default defineConfig({
  ...base,
  // `src/types.ts` is (and always was) a types-only entry: its emitted JS
  // is empty, and the `./types` subpath exists so consumers can
  // `import type` from it.
  entry: ["src/index.ts", "src/types.ts"],
  unused: { level: "error" },
});
