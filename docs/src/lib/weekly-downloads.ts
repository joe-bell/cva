import type { Loader } from "astro/loaders";
import { z } from "astro/zod";

export const WEEKLY_DOWNLOAD_PACKAGES = [
  "class-variance-authority",
  "cva",
] as const;

export type WeeklyDownloadsPackage = (typeof WEEKLY_DOWNLOAD_PACKAGES)[number];

export const WEEKLY_DOWNLOADS_ENDPOINT =
  "https://api.npmjs.org/downloads/point/last-week/class-variance-authority,cva";
export const WEEKLY_DOWNLOADS_TIMEOUT_MS = 10_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

function isCalendarDate(value: string) {
  if (!ISO_DATE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function utcDateDifference(start: string, end: string) {
  return (
    (Date.parse(`${end}T00:00:00.000Z`) -
      Date.parse(`${start}T00:00:00.000Z`)) /
    MILLISECONDS_PER_DAY
  );
}

const downloadCountSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, {
    message: "Download count must be a nonnegative safe integer.",
  });

const isoDateSchema = z.string().refine(isCalendarDate, {
  message: "Date must be a real YYYY-MM-DD value.",
});

export const weeklyDownloadSchema = z
  .object({
    downloads: downloadCountSchema,
    package: z.enum(WEEKLY_DOWNLOAD_PACKAGES),
    start: isoDateSchema,
    end: isoDateSchema,
  })
  .strict();

export type WeeklyDownload = z.infer<typeof weeklyDownloadSchema>;

export function totalWeeklyDownloads(first: number, second: number) {
  const total = first + second;

  if (!Number.isSafeInteger(total)) {
    throw new Error("Combined weekly download count must be a safe integer.");
  }

  return total;
}

const weeklyDownloadsResponseSchema = z
  .object({
    "class-variance-authority": weeklyDownloadSchema,
    cva: weeklyDownloadSchema,
  })
  .strict()
  .superRefine((reports, context) => {
    const stable = reports["class-variance-authority"];
    const beta = reports.cva;

    if (stable.package !== "class-variance-authority") {
      context.addIssue({
        code: "custom",
        message: "Stable download report has the wrong package identity.",
        path: ["class-variance-authority", "package"],
      });
    }

    if (beta.package !== "cva") {
      context.addIssue({
        code: "custom",
        message: "Beta download report has the wrong package identity.",
        path: ["cva", "package"],
      });
    }

    if (stable.start !== beta.start) {
      context.addIssue({
        code: "custom",
        message: "Download reports must have matching start dates.",
        path: ["start"],
      });
    }

    if (stable.end !== beta.end) {
      context.addIssue({
        code: "custom",
        message: "Download reports must have matching end dates.",
        path: ["end"],
      });
    }

    if (utcDateDifference(stable.start, stable.end) !== 6) {
      context.addIssue({
        code: "custom",
        message: "Download reports must cover seven inclusive days.",
        path: ["end"],
      });
    }

    if (!Number.isSafeInteger(stable.downloads + beta.downloads)) {
      context.addIssue({
        code: "custom",
        message: "Combined weekly download count must be a safe integer.",
        path: ["downloads"],
      });
    }
  });

export type Fetch = typeof globalThis.fetch;

export function parseWeeklyDownloadsResponse(data: unknown) {
  return weeklyDownloadsResponseSchema.parse(data);
}

export async function fetchWeeklyDownloadReports(
  fetchImpl: Fetch = globalThis.fetch,
) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Weekly npm download request timed out after ${WEEKLY_DOWNLOADS_TIMEOUT_MS}ms.`,
        ),
      );
      controller.abort();
    }, WEEKLY_DOWNLOADS_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      fetchImpl(WEEKLY_DOWNLOADS_ENDPOINT, { signal: controller.signal }),
      timeout,
    ]);

    if (!response.ok) {
      throw new Error(
        `Weekly npm download request failed with HTTP ${response.status}.`,
      );
    }

    return parseWeeklyDownloadsResponse(
      await Promise.race([response.json(), timeout]),
    );
  } finally {
    clearTimeout(timeoutId!);
  }
}

export function requiredWeeklyDownloadEntry<T>(
  entry: T | undefined,
  packageName: WeeklyDownloadsPackage,
): T {
  if (entry === undefined) {
    throw new Error(`Missing ${packageName} weekly download report.`);
  }

  return entry;
}

const compactDownloads = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const utcDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatWeeklyDownloads(downloads: number) {
  return compactDownloads.format(downloads);
}

export function formatWeeklyDownloadDate(date: string) {
  return utcDate.format(new Date(`${date}T00:00:00.000Z`));
}

export function weeklyDownloadsLoader({
  fetchImpl = globalThis.fetch,
}: {
  fetchImpl?: Fetch;
} = {}) {
  return {
    name: "weekly-downloads",
    async load(context) {
      try {
        const reports = await fetchWeeklyDownloadReports(fetchImpl);
        const entries = await Promise.all(
          WEEKLY_DOWNLOAD_PACKAGES.map(async (packageName) => ({
            id: packageName,
            data: await context.parseData({
              id: packageName,
              data: reports[packageName],
            }),
          })),
        );

        context.store.clear();
        for (const entry of entries) context.store.set(entry);
      } catch (error) {
        context.store.clear();
        throw error;
      }
    },
  } satisfies Loader;
}
