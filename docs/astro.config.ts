import { config } from "./src/config";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkUnwrapImages from "remark-unwrap-images";
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  site: config.site,
  output: "hybrid",
  compressHTML: true,
  markdown: {
    syntaxHighlight: "prism",
    remarkPlugins: [remarkUnwrapImages],
  },
  integrations: [sitemap(), mdx()],
  adapter: vercel({
    analytics: false,
  }),
});
