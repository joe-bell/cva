import { defineConfig, tierPresets } from "sponsorkit";

export default defineConfig({
  renderer: "tiers",
  outputDir: ".github/static/sponsorkit",
  tiers: [
    {
      title: "Backers",
      preset: tierPresets.none,
    },
    {
      title: "Individual Backers",
      monthlyDollars: 5,
      preset: tierPresets.small,
    },
    {
      title: "Generous Backers",
      monthlyDollars: 25,
      preset: tierPresets.medium,
    },
  ],
});
