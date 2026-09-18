import { dirname } from "node:path";
import type { Configuration } from "lint-staged";

export default {
  "*.{astro,cts,js,jsx,mts,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "{.config/*.{mts,ts},.config/tsconfig.*.json,.github/scripts/*.ts,.conductor/scripts/*.ts}":
    () => "pnpm check:scripts",
  "package.json": () => "pnpm syncpack:lint",
  // One pattern avoids parallel lint runs when a change touches multiple inputs.
  "{.agents/skills/**,skills/**,skill-check.config.json}": () =>
    "pnpm lint:skills",
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  "!(*.{astro,cts,js,jsx,mts,svelte,ts,tsx,vue})": (filenames) =>
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
} satisfies Configuration;
