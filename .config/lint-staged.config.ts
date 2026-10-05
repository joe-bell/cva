import { dirname, relative } from "node:path";
import type { Configuration } from "lint-staged";

const skillInput =
  /^(?:\.agents\/skills\/|skills\/|skill-check\.config\.json$)/;

const isSkillInput = (filename: string) =>
  skillInput.test(relative(process.cwd(), filename).split("\\").join("/"));

export default {
  "*.{astro,cts,js,jsx,mts,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "{.config/*.{mts,ts},.config/tsconfig.*.json,.github/scripts/*.ts}": () =>
    "pnpm check:scripts",
  "package.json": () => "pnpm syncpack:lint",
  "**/wrangler.jsonc": (filenames) =>
    filenames.map(
      (filename) => `pnpm --dir '${dirname(filename)}' exec wrangler types`,
    ),
  // Skill inputs are all non-code files, so the skills lint runs here, after
  // Prettier has rewritten them. A separate entry would run concurrently with
  // this one and could read a file while Prettier writes it.
  "!(*.{astro,cts,js,jsx,mts,svelte,ts,tsx,vue})": (filenames) => [
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
    ...(filenames.some(isSkillInput) ? ["pnpm lint:skills"] : []),
  ],
} satisfies Configuration;
