import { z, defineCollection } from "astro:content";

const docs = defineCollection({
  type: "content",
  schema: z.object({}),
});

export const collections = {
  docs,
};
