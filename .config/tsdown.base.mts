// Shared tsdown config, defaulting to `packages/cva`'s requirements;
// packages spread this and override only where they differ. See
// CONTRIBUTING.md's "Build & publish" section for the full pipeline.
import type { UserConfig } from "tsdown";

export const base = {
  format: ["esm", "cjs"],
  platform: "neutral",
  // Explicit `.cjs`/`.d.cts` CJS output (with `platform: "neutral"` the
  // default would be `.js`/`.d.ts`).
  fixedExtension: true,
  // Keep in sync with `tsconfig.base.json`.
  target: "es2019",
  // Declarations come from tsc: the public types don't satisfy
  // `isolatedDeclarations`.
  dts: true,
  sourcemap: true,
  clean: true,
  // Regenerates package.json's `exports` (dev, `src/`) and
  // `publishConfig.exports` (publish, `dist/`) on every build - don't
  // hand-edit those blocks.
  exports: { devExports: true },
  // Validate the publish shape on every build: a failure here means the
  // packed manifest broke, not the source. Switch attw to "ci-only" if the
  // per-install cost ever bites.
  publint: { level: "error" },
  // `ignore`: cva's type-only optional peer; a no-op where absent.
  unused: { level: "error", ignore: ["typescript"] },
  attw: { profile: "strict", level: "error" },
} satisfies UserConfig;
