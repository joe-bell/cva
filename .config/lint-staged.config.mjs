export default {
  "*.{astro,js,jsx,svelte,ts,tsx,vue}": (filenames) => [
    "pnpm run --filter '!.' --parallel check",
    `pnpm prettier --write ${filenames.map((f) => `'${f}'`).join(" ")}`,
  ],
  "package.json": () => "pnpm syncpack",
  "!(*.{astro,js,jsx,svelte,ts,tsx,vue})": (filenames) =>
    `pnpm prettier --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
};
