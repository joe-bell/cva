export default {
  "*": (filenames) =>
    `prettier --ignore-unknown --no-error-on-unmatched-pattern --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
  "src/**/*.{js,jsx,ts,tsx}": () => "npm run lint:tsc",
};
