// Shared tsdown options for the published packages. Each package's
// `tsdown.config.mts` spreads this and adds only its genuine deltas
// (entry points, sourcemaps, unused-check options).
import type { UserConfig } from "tsdown";

export const base = {
  format: ["esm", "cjs"],
  // The packages are isomorphic (browser + Node) and use no Node built-ins.
  platform: "neutral",
  // Matches `tsconfig.base.json` in this directory.
  target: "es2019",
  // Declarations come from the TypeScript compiler under the hood. Don't
  // enable tsdown's fast isolated-declarations path without checking the
  // public API's inferred types satisfy `isolatedDeclarations` first.
  dts: true,
  clean: true,
  // Keep the extensions the packages have always shipped: `.js`/`.d.ts` for
  // CJS, `.mjs`/`.d.mts` for ESM (tsdown defaults CJS to `.cjs`/`.d.cts`).
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
    dts: format === "cjs" ? ".d.ts" : ".d.mts",
  }),
  // Regenerates `exports` and `publishConfig.exports` in package.json on
  // every build - never hand-edit either block, change the config instead.
  // `exports` points at `src/` so workspace consumers (tests, examples,
  // docs) resolve raw TypeScript with no build step in between.
  // `publishConfig.exports` points at `dist/`; pnpm applies `publishConfig`
  // when packing or publishing (`pnpm pack` / `pnpm publish` - never
  // `npm pack`, which skips the rewrite), so installed consumers get
  // `dist/`. Neither map declares explicit `types` conditions - TypeScript
  // auto-pairs `index.mjs` -> `index.d.mts` and `index.js` -> `index.d.ts`,
  // which the attw gate below verifies across all four resolution modes.
  exports: { devExports: true },
  // `publint` and `attw` (and each package's `unused` check) run *inside*
  // the build at `level: "error"`, so a red build from one of them means
  // the publish shape broke, not the source. publint checks package.json
  // fields against the actual output files; attw packs the tarball and
  // validates the publishConfig-rewritten manifest across node10,
  // node16-CJS, node16-ESM, and bundler resolution. If the per-install
  // cost (builds run on every `pnpm install` via `prepare:packages`) ever
  // becomes a problem, switch to `attw: 'ci-only'`.
  publint: { level: "error" },
  attw: { profile: "strict", level: "error" },
} satisfies UserConfig;
