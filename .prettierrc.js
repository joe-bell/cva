module.exports = {
  plugins: [
    "prettier-plugin-astro",
    "prettier-plugin-packagejson",
    "prettier-plugin-tailwindcss",
  ],
  tailwindFunctions: ["cva", "cx"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
