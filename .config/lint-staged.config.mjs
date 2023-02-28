export default {
  "*": (filenames) =>
    `pnpm run prettier -- --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
  "**/*.{astro,js,jsx,svelte,ts,tsx,vue}": () =>
    "pnpm run --filter '*' --parallel check",
  "**/package.json": () => "pnpm syncpack",
};
