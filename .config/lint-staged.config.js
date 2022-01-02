module.exports = {
  "*": (filenames) =>
    `prettier --ignore-unknown --write ${filenames
      .map((filename) => `'${filename}'`)
      .join(" ")}`,
  "src/**/*.{js,jsx,ts,tsx}": () => "npm run check:tsc",
};
