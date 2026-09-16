import { readFile, writeFile } from "node:fs/promises";

export const WEEKLY_DOWNLOADS_ENDPOINT =
  "https://api.npmjs.org/downloads/point/last-week/class-variance-authority,cva";
export const WEEKLY_DOWNLOADS_TIMEOUT_MS = 10_000;
export const WEEKLY_DOWNLOADS_OUTPUT_URL = new URL(
  "../../docs/src/content/npm-weekly-downloads.json",
  import.meta.url,
);

const PACKAGES = ["class-variance-authority", "cva"];
const REPORT_KEYS = ["downloads", "end", "package", "start"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function parseReport(value, packageName) {
  if (!isRecord(value) || !hasExactKeys(value, REPORT_KEYS)) {
    throw new Error(`Invalid npm download report for ${packageName}.`);
  }
  if (value.package !== packageName) {
    throw new Error(
      `npm returned the wrong package identity for ${packageName}.`,
    );
  }
  if (!Number.isSafeInteger(value.downloads) || value.downloads < 0) {
    throw new Error(`Invalid npm download count for ${packageName}.`);
  }
  if (!isCalendarDate(value.start) || !isCalendarDate(value.end)) {
    throw new Error(`Invalid npm download date for ${packageName}.`);
  }
  return value;
}

export function parseWeeklyDownloadsResponse(value) {
  if (!isRecord(value) || !hasExactKeys(value, [...PACKAGES].sort())) {
    throw new Error("Invalid npm weekly downloads response.");
  }

  const stable = parseReport(value["class-variance-authority"], PACKAGES[0]);
  const beta = parseReport(value.cva, PACKAGES[1]);

  if (stable.start !== beta.start || stable.end !== beta.end) {
    throw new Error("npm download reports must cover matching dates.");
  }

  const window =
    (Date.parse(`${stable.end}T00:00:00.000Z`) -
      Date.parse(`${stable.start}T00:00:00.000Z`)) /
    MILLISECONDS_PER_DAY;
  if (window !== 6) {
    throw new Error("npm download reports must cover seven inclusive days.");
  }

  if (!Number.isSafeInteger(stable.downloads + beta.downloads)) {
    throw new Error("Combined weekly download count must be a safe integer.");
  }

  return {
    start: stable.start,
    end: stable.end,
    packages: {
      "class-variance-authority": stable.downloads,
      cva: beta.downloads,
    },
  };
}

export async function fetchWeeklyDownloads(
  fetchImpl = globalThis.fetch,
  timeoutMs = WEEKLY_DOWNLOADS_TIMEOUT_MS,
) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Weekly npm download request timed out after ${timeoutMs}ms.`,
        ),
      );
      controller.abort();
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(WEEKLY_DOWNLOADS_ENDPOINT, {
        redirect: "error",
        signal: controller.signal,
      }),
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
    clearTimeout(timeoutId);
  }
}

export function serializeWeeklyDownloads(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function isMissingFile(error) {
  return isRecord(error) && error.code === "ENOENT";
}

export async function updateWeeklyDownloads({
  fetchImpl = globalThis.fetch,
  outputUrl = WEEKLY_DOWNLOADS_OUTPUT_URL,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
} = {}) {
  const snapshot = await fetchWeeklyDownloads(fetchImpl);
  const content = serializeWeeklyDownloads(snapshot);
  let current;

  try {
    current = await readFileImpl(outputUrl, "utf8");
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  if (current === content) return { changed: false, snapshot };

  await writeFileImpl(outputUrl, content, "utf8");
  return { changed: true, snapshot };
}
