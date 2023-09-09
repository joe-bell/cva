import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  tutorials: defineCollection({
    type: "data",
    schema: () => {
      const common = z.object({
        title: z.string(),
        author: z.string(),
        date: z.string().transform((str) => new Date(str)),
        language: z.enum(["en"]),
        package: z.enum(["class-variance-authority", "cva"]),
      });

      return z.discriminatedUnion("format", [
        common.merge(
          z.object({ format: z.literal("Audio"), url: z.string().url() })
        ),
        common.merge(
          z.object({ format: z.literal("Article"), url: z.string().url() })
        ),
        common.merge(
          z.object({ format: z.literal("YouTube"), youtubeId: z.string() })
        ),
      ]);
    },
  }),
};
