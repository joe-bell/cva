import { dirname } from "node:path";

/** @type {import("lint-staged").Configuration} */
export default {
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "package.json": () => "pnpm syncpack:lint",
  // One key for both skill roots: `skills/` is the canonical home of the
  // top-level reusable skills and `.agents/skills/` holds the contributor
  // skills plus the mirrors. A single pattern keeps a change that touches
  // both from starting two concurrent `lint:skills` runs.
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
