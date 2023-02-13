export default {
  "*": (filenames) =>
    `pnpm run prettier -- --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
  "**/*.{js,jsx,ts,tsx}": () => "pnpm tsc",
  "**/package.json": (filenames) => "pnpm syncpack:list-mismatches",
};
