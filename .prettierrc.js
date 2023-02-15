module.exports = {
  plugins: [
    require.resolve("prettier-plugin-astro"),
    require.resolve("prettier-plugin-packagejson"),
    require.resolve("prettier-plugin-tailwindcss"),
  ],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
  pluginSearchDirs: ["."],
};
