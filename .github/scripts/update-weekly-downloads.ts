import { readFile, writeFile } from "node:fs/promises";

export const WEEKLY_DOWNLOADS_ENDPOINT =
  "https://api.npmjs.org/downloads/point/last-week/class-variance-authority,cva";
export const WEEKLY_DOWNLOADS_TIMEOUT_MS = 10_000;
export const MINIMUM_WEEKLY_DOWNLOAD_RATIO = 0.5;
export const WEEKLY_DOWNLOADS_OUTPUT_URL = new URL(
  "../../docs/src/content/npm-weekly-downloads.json",
  import.meta.url,
);

const PACKAGES = ["class-variance-authority", "cva"] as const;
const REPORT_KEYS = ["downloads", "end", "package", "start"];
const SNAPSHOT_KEYS = ["end", "packages", "start"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

type PackageName = (typeof PACKAGES)[number];

export type WeeklyDownloadsSnapshot = {
  start: string;
  end: string;
  packages: Record<PackageName, number>;
};

type DownloadReport = {
  downloads: number;
  end: string;
  package: PackageName;
  start: string;
};

type FetchImpl = (input: string, init: RequestInit) => Promise<unknown>;
type ReadFileImpl = (url: URL, encoding: "utf8") => Promise<string>;
type WriteFileImpl = (
  url: URL,
  content: string,
  encoding: "utf8",
) => Promise<unknown>;

type UpdateWeeklyDownloadsOptions = {
  fetchImpl?: FetchImpl;
  outputUrl?: URL;
  readFileImpl?: ReadFileImpl;
  writeFileImpl?: WriteFileImpl;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function parseDownloadCount(value: unknown, packageName: PackageName): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid npm download count for ${packageName}.`);
  }
  return value;
}

function parseReport(value: unknown, packageName: PackageName): DownloadReport {
  if (!isRecord(value) || !hasExactKeys(value, REPORT_KEYS)) {
    throw new Error(`Invalid npm download report for ${packageName}.`);
  }
  if (value.package !== packageName) {
    throw new Error(
      `npm returned the wrong package identity for ${packageName}.`,
    );
  }
  if (typeof value.start !== "string" || typeof value.end !== "string") {
    throw new Error(`Invalid npm download report for ${packageName}.`);
  }
  return {
    downloads: parseDownloadCount(value.downloads, packageName),
    end: value.end,
    package: packageName,
    start: value.start,
  };
}

export function parseWeeklyDownloadsSnapshot(
  value: unknown,
): WeeklyDownloadsSnapshot {
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS)) {
    throw new Error("Invalid weekly npm download snapshot.");
  }
  if (!isRecord(value.packages) || !hasExactKeys(value.packages, PACKAGES)) {
    throw new Error("Invalid weekly npm download packages.");
  }
  if (!isCalendarDate(value.start) || !isCalendarDate(value.end)) {
    throw new Error("Invalid weekly npm download date.");
  }

  const stable = parseDownloadCount(
    value.packages["class-variance-authority"],
    PACKAGES[0],
  );
  const beta = parseDownloadCount(value.packages.cva, PACKAGES[1]);
  const window =
    (Date.parse(`${value.end}T00:00:00.000Z`) -
      Date.parse(`${value.start}T00:00:00.000Z`)) /
    MILLISECONDS_PER_DAY;

  if (window !== 6) {
    throw new Error("npm download reports must cover seven inclusive days.");
  }
  if (!Number.isSafeInteger(stable + beta)) {
    throw new Error("Combined weekly download count must be a safe integer.");
  }

  return {
    start: value.start,
    end: value.end,
    packages: {
      "class-variance-authority": stable,
      cva: beta,
    },
  };
}

export function parseWeeklyDownloadsResponse(
  value: unknown,
): WeeklyDownloadsSnapshot {
  if (!isRecord(value) || !hasExactKeys(value, [...PACKAGES].sort())) {
    throw new Error("Invalid npm weekly downloads response.");
  }

  const stable = parseReport(value["class-variance-authority"], PACKAGES[0]);
  const beta = parseReport(value.cva, PACKAGES[1]);

  if (stable.start !== beta.start || stable.end !== beta.end) {
    throw new Error("npm download reports must cover matching dates.");
  }

  return parseWeeklyDownloadsSnapshot({
    start: stable.start,
    end: stable.end,
    packages: {
      "class-variance-authority": stable.downloads,
      cva: beta.downloads,
    },
  });
}

export function assertPlausibleWeeklyDownloads(
  snapshot: WeeklyDownloadsSnapshot,
  previousSnapshot: WeeklyDownloadsSnapshot,
) {
  if (Date.parse(snapshot.end) < Date.parse(previousSnapshot.end)) {
    throw new Error(
      "Weekly npm download snapshot is older than the current snapshot.",
    );
  }

  for (const packageName of PACKAGES) {
    const previous = previousSnapshot.packages[packageName];
    const minimum = Math.ceil(previous * MINIMUM_WEEKLY_DOWNLOAD_RATIO);
    if (snapshot.packages[packageName] < minimum) {
      throw new Error(
        `Weekly npm downloads for ${packageName} fell below ${MINIMUM_WEEKLY_DOWNLOAD_RATIO * 100}% of the previous snapshot (${snapshot.packages[packageName]} vs ${previous}).`,
      );
    }
  }
}

export async function fetchWeeklyDownloads(
  fetchImpl: FetchImpl = globalThis.fetch,
  timeoutMs = WEEKLY_DOWNLOADS_TIMEOUT_MS,
) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
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

    if (
      !isRecord(response) ||
      typeof response.ok !== "boolean" ||
      typeof response.status !== "number" ||
      typeof response.json !== "function"
    ) {
      throw new Error("Invalid npm weekly downloads response.");
    }
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

export function serializeWeeklyDownloads(snapshot: WeeklyDownloadsSnapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function isMissingFile(error: unknown) {
  return isRecord(error) && error.code === "ENOENT";
}

export async function updateWeeklyDownloads({
  fetchImpl = globalThis.fetch,
  outputUrl = WEEKLY_DOWNLOADS_OUTPUT_URL,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
}: UpdateWeeklyDownloadsOptions = {}) {
  const snapshot = await fetchWeeklyDownloads(fetchImpl);
  const content = serializeWeeklyDownloads(snapshot);
  let current: string | undefined;

  try {
    current = await readFileImpl(outputUrl, "utf8");
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  if (current === content) return { changed: false, snapshot };

  if (current !== undefined) {
    const previousSnapshot = parseWeeklyDownloadsSnapshot(JSON.parse(current));
    assertPlausibleWeeklyDownloads(snapshot, previousSnapshot);
  }

  await writeFileImpl(outputUrl, content, "utf8");
  return { changed: true, snapshot };
}
