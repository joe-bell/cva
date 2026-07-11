import type { UserConfig } from "tsdown";

export const base = {
  format: ["esm", "cjs"],
  platform: "neutral",
  fixedExtension: true,
  // Keep in sync with `tsconfig.base.json`.
  target: "es2019",
  dts: true,
  sourcemap: true,
  clean: true,
  // Regenerates package.json's `exports` (dev, `src/`) and
  // `publishConfig.exports` (publish, `dist/`) on every build - don't
  // hand-edit those blocks.
  exports: { devExports: true },
  // Validate the publish shape on every build: a failure here means the
  // packed manifest broke, not the source.
  publint: { level: "error" },
  // `ignore`: cva's type-only optional peer; a no-op where absent.
  unused: { level: "error", ignore: ["typescript"] },
  attw: { profile: "strict", level: "error" },
} satisfies UserConfig;
