import { defineConfig } from "tsdown";

export default defineConfig({
  // `src/types.ts` is (and always was) a types-only entry: its emitted JS is
  // empty, and the `./types` subpath exists so consumers can
  // `import type` from it.
  entry: ["src/index.ts", "src/types.ts"],
  format: ["esm", "cjs"],
  // class-variance-authority is isomorphic (browser + Node) and uses no
  // Node built-ins.
  platform: "neutral",
  // Matches the repo-wide `.config/tsconfig.base.json`.
  target: "es2019",
  // Declarations come from the TypeScript compiler under the hood. Don't
  // enable tsdown's fast isolated-declarations path without checking the
  // public API's inferred types satisfy `isolatedDeclarations` first.
  dts: true,
  // The package has never shipped sourcemaps; keep the published shape.
  sourcemap: false,
  clean: true,
  // Keep the extensions the package has always shipped: `.js`/`.d.ts` for
  // CJS, `.mjs`/`.d.mts` for ESM (tsdown defaults CJS to `.cjs`/`.d.cts`).
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
    dts: format === "cjs" ? ".d.ts" : ".d.mts",
  }),
  // Regenerates `exports` and `publishConfig.exports` in package.json on
  // every build - never hand-edit either block, change this config instead.
  // `exports` points at `src/` so workspace consumers (tests, examples,
  // docs) resolve raw TypeScript with no build step in between.
  // `publishConfig.exports` points at `dist/`; pnpm applies `publishConfig`
  // when packing or publishing (`pnpm pack` / `pnpm publish` - never
  // `npm pack`, which skips the rewrite), so installed consumers get
  // `dist/`. Neither map declares explicit `types` conditions - TypeScript
  // auto-pairs `index.mjs` -> `index.d.mts` and `index.js` -> `index.d.ts`,
  // which the attw gate below verifies across all four resolution modes.
  // One manifest field is hand-maintained: `publishConfig.typesVersions`
  // (the node10 fallback for the `./types` subpath) - tsdown doesn't
  // generate it, but it preserves it across rebuilds.
  exports: { devExports: true },
  // `publint`, `attw`, and `unused` all run *inside* the build at
  // `level: "error"`, so a red build from one of them means the publish
  // shape broke, not the source.
  //
  // Checks `package.json` fields against the actual output files.
  publint: { level: "error" },
  // Flags unused `dependencies`/`peerDependencies` (devDependencies are
  // not checked).
  unused: { level: "error" },
  // Packs the tarball and validates the publishConfig-rewritten manifest
  // across node10, node16-CJS, node16-ESM, and bundler resolution. If the
  // per-install cost (this build runs on every `pnpm install` via
  // `prepare:packages`) ever becomes a problem, switch to
  // `attw: 'ci-only'`.
  attw: { profile: "strict", level: "error" },
});
