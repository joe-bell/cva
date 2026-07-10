import { dirname } from "node:path";

/** @type {import("lint-staged").Configuration} */
export default {
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "package.json": () => "pnpm syncpack:lint",
  ".agents/skills/**": () => "pnpm lint:skills",
  "docs/src/content/docs/**/*.mdx": (filenames) =>
    `node .config/check-docs-dashes.mjs ${filenames.map((f) => `'${f}'`).join(" ")}`,
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  "!(*.{astro,js,jsx,svelte,ts,tsx,vue})": (filenames) =>
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
};
