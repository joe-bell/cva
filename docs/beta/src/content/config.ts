import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { format } from "date-fns";

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  tutorials: defineCollection({
    type: "data",
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
