module.exports = {
  plugins: [
    "prettier-plugin-astro",
    "prettier-plugin-packagejson",
    "prettier-plugin-tailwindcss",
  ],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
