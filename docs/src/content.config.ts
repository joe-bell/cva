import { file, glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { docsVersionsLoader } from "starlight-versions/loader";
import { format } from "date-fns";

const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
const NONBREAKING_SPACE = "\u00a0";
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactLongNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});
const decimalNumber = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
});
const utcDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

const bundleSizeSchema = z
  .object({
    passed: z.literal(true),
    size: z.int().positive(),
    sizeLimit: z.int().positive(),
  })
  .strict()
  .refine(({ size, sizeLimit }) => size <= sizeLimit, {
    message: "Bundle size must not exceed its limit.",
    path: ["size"],
  })
  .transform((data) => {
    const magnitude = Math.min(
      Math.floor(Math.log10(data.size) / 3),
      DECIMAL_UNITS.length - 1,
    );
    const value = data.size / 1000 ** magnitude;

    return {
      ...data,
      formattedSize: `${decimalNumber.format(value)}${NONBREAKING_SPACE}${DECIMAL_UNITS[magnitude]}`,
    };
  });

const weeklyDownloadCountSchema = z.int().nonnegative();

const weeklyDownloadsSchema = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    packages: z
      .object({
        "class-variance-authority": weeklyDownloadCountSchema,
        cva: weeklyDownloadCountSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const day = 86_400_000;
    if ((Date.parse(snapshot.end) - Date.parse(snapshot.start)) / day !== 6) {
      context.addIssue({
        code: "custom",
        message: "Weekly downloads must cover seven inclusive days.",
        path: ["end"],
      });
    }

    if (
      !Number.isSafeInteger(
        snapshot.packages["class-variance-authority"] + snapshot.packages.cva,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Combined weekly download count must be a safe integer.",
        path: ["packages"],
      });
    }
  })
  .transform((snapshot) => {
    const formatDownloads = (value: number) => ({
      value,
      formatted: compactNumber.format(value),
      formattedLong: compactLongNumber.format(value),
    });

    return {
      start: snapshot.start,
      end: {
        value: snapshot.end,
        formatted: utcDate.format(new Date(`${snapshot.end}T00:00:00.000Z`)),
      },
      packages: {
        "class-variance-authority": formatDownloads(
          snapshot.packages["class-variance-authority"],
        ),
        cva: formatDownloads(snapshot.packages.cva),
      },
      total: formatDownloads(
        snapshot.packages["class-variance-authority"] + snapshot.packages.cva,
      ),
    };
  });

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    // Require a `description` on every page — Starlight's own schema leaves
    // it optional, but every page here needs one for SEO/OG meta.
    schema: docsSchema({ extend: z.object({ description: z.string() }) }),
  }),
  versions: defineCollection({ loader: docsVersionsLoader() }),
  bundleSizes: defineCollection({
    loader: file("./.generated/bundle-sizes.json"),
    schema: bundleSizeSchema,
  }),
  weeklyDownloads: defineCollection({
    loader: glob({
      pattern: "npm-weekly-downloads.json",
      base: "./src/content",
    }),
    schema: weeklyDownloadsSchema,
  }),
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
