import { dirname } from "node:path";

/** @type {import("lint-staged").Configuration} */
export default {
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "package.json": () => "pnpm syncpack:lint",
  // One pattern avoids parallel lint runs when a change touches both roots.
  "{.agents/skills,skills}/**": () => "pnpm lint:skills",
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  "!(*.{astro,js,jsx,svelte,ts,tsx,vue})": (filenames) =>
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
};
