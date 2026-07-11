import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // cva is isomorphic (browser + Node) and uses no Node built-ins.
  platform: "neutral",
  target: "es2019",
  dts: true,
  sourcemap: true,
  clean: true,
  // Keep the extensions the package has always shipped: `.js`/`.d.ts` for
  // CJS, `.mjs`/`.d.mts` for ESM (tsdown defaults CJS to `.cjs`/`.d.cts`).
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
    dts: format === "cjs" ? ".d.ts" : ".d.mts",
  }),
  // Regenerates `exports` (dev, pointing at `src/`) and
  // `publishConfig.exports` (publish, pointing at `dist/`) on every build.
  exports: { devExports: true },
  publint: { level: "error" },
  // `typescript` is an optional peer used only at the type level (never
  // imported at runtime), so the unused check can't see it.
  unused: { level: "error", ignore: ["typescript"] },
  attw: { profile: "strict", level: "error" },
});
