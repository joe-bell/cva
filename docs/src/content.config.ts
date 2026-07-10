import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { docsVersionsLoader } from "starlight-versions/loader";
import { format } from "date-fns";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    // Require a `description` on every page — Starlight's own schema leaves
    // it optional, but every page here needs one for SEO/OG meta.
    schema: docsSchema({ extend: z.object({ description: z.string() }) }),
  }),
  versions: defineCollection({ loader: docsVersionsLoader() }),
  tutorials: defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/tutorials" }),
    schema: () => {
      const common = z.object({
        title: z.string(),
        author: z.string(),
        date: z.string().transform((string) => {
          const date = new Date(string);
          return {
            string,
            localeString: format(date, "do MMMM y"),
            object: date,
          };
        }),
        language: z.enum(["en"]),
        package: z.enum(["class-variance-authority", "cva"]),
      });

      return z.discriminatedUnion("format", [
        common.extend({ format: z.literal("Audio"), url: z.url() }),
        common.extend({ format: z.literal("Article"), url: z.url() }),
        common.extend({ format: z.literal("YouTube"), youtubeId: z.string() }),
      ]);
    },
  }),
};
