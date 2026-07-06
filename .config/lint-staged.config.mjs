import { dirname } from "node:path";

// Prettier already carries `--ignore-unknown` via the root `prettier` script,
// so it safely skips any file type it can't handle. Filenames are single-quoted
// to survive spaces. Factored out because two globs share it.
const prettierWrite = (filenames) =>
  `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`;

/** @type {import("lint-staged").Configuration} */
export default {
  // lint-staged runs each glob's tasks concurrently with the other globs, but
  // tasks *within* one glob run in sequence. Type-check then format has to live
  // in a single glob so Prettier never rewrites a file while `tsc` is still
  // reading it. `check` ignores the filenames (whole-project type-check) and
  // only fires when a code file is staged.
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    prettierWrite(filenames),
  ],
  "package.json": () => "pnpm syncpack:lint",
  ".agents/skills/**": () => "pnpm lint:skills",
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  // Everything that isn't a code file: format only.
  "!(*.{astro,js,jsx,svelte,ts,tsx,vue})": prettierWrite,
};
