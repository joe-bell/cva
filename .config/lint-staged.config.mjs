import { dirname } from "node:path";

export default {
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "package.json": () => "pnpm syncpack:lint",
  // Regenerate Wrangler types in whichever package owns the changed config.
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  "!(*.{astro,js,jsx,svelte,ts,tsx,vue})": (filenames) =>
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
};
