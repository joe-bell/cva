import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Loader } from "astro/loaders";
import { z } from "astro/zod";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export const BUNDLE_SIZE_IDS = ["stable", "beta"] as const;

interface BundleSizeSource {
  id: (typeof BUNDLE_SIZE_IDS)[number];
  package: string;
  buildEntry: string;
  reportPath: string;
}

export const BUNDLE_SIZE_SOURCES = [
  {
    id: "stable",
    package: "class-variance-authority",
    buildEntry: "dist/index.js",
    reportPath: path.join(
      REPOSITORY_ROOT,
      "packages/class-variance-authority/bundle-size.json",
    ),
  },
  {
    id: "beta",
    package: "cva",
    buildEntry: "dist/index.cjs",
    reportPath: path.join(REPOSITORY_ROOT, "packages/cva/bundle-size.json"),
  },
] as const satisfies readonly BundleSizeSource[];

export const bundleSizeSchema = z
  .object({
    size: z.int().positive(),
    sizeLimit: z.int().positive(),
    passed: z.literal(true),
  })
  .refine(({ size, sizeLimit }) => size <= sizeLimit, {
    message: "Bundle size must not exceed its limit.",
    path: ["size"],
  })
  .transform(({ size }) => ({ size }));

export type ReadText = (filePath: string) => Promise<string>;

export async function readBundleSizeText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

const readText: ReadText = readBundleSizeText;

export function assertOwnedBundleSizeSources(
  sources: readonly Pick<BundleSizeSource, "id">[],
) {
  const ids = sources.map(({ id }) => id);
  if (
    ids.length !== BUNDLE_SIZE_IDS.length ||
    new Set(ids).size !== ids.length ||
    BUNDLE_SIZE_IDS.some((id) => !ids.includes(id))
  ) {
    throw new Error(
      "Bundle size reports must own only the stable and beta IDs.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJson(filePath: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}.`);
  }
}

function rootResult(source: BundleSizeSource, report: unknown) {
  if (isRecord(report) && "error" in report) {
    throw new Error(
      `Size Limit failed for ${source.package}: ${String(report.error)}`,
    );
  }
  if (!Array.isArray(report)) {
    throw new Error(`Size Limit report for ${source.package} is not an array.`);
  }

  const roots = report.filter(
    (entry): entry is Record<string, unknown> =>
      isRecord(entry) && entry.name === source.buildEntry,
  );
  if (roots.length !== 1) {
    throw new Error(
      `Expected one ${source.buildEntry} result for ${source.package}.`,
    );
  }
  return roots[0]!;
}

export async function readBundleSizeEntries(readTextImpl: ReadText = readText) {
  return Promise.all(
    BUNDLE_SIZE_SOURCES.map(async (source) => {
      const result = rootResult(
        source,
        parseJson(source.reportPath, await readTextImpl(source.reportPath)),
      );

      return {
        id: source.id,
        data: {
          size: result.size,
          sizeLimit: result.sizeLimit,
          passed: result.passed,
        },
      };
    }),
  );
}

function loaderError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function requiredBundleSizeEntry<T>(
  entry: T | undefined,
  id: string,
): T {
  if (entry === undefined) throw new Error(`Missing ${id} bundle size report.`);
  return entry;
}

export function bundleSizeLoader({
  readTextImpl = readText,
}: { readTextImpl?: ReadText } = {}) {
  assertOwnedBundleSizeSources(BUNDLE_SIZE_SOURCES);
  let refreshVersion = 0;

  return {
    name: "bundle-size",
    async load(context) {
      const reportPaths = BUNDLE_SIZE_SOURCES.map(
        ({ reportPath }) => reportPath,
      );

      const refresh = async (throwOnError: boolean) => {
        const version = ++refreshVersion;
        try {
          context.store.clear();
          const entries = await readBundleSizeEntries(readTextImpl);
          const parsedEntries = await Promise.all(
            entries.map(async ({ id, data }) => ({
              id,
              data: await context.parseData({ id, data }),
            })),
          );
          if (version !== refreshVersion) return;
          for (const entry of parsedEntries) context.store.set(entry);
        } catch (error) {
          if (version !== refreshVersion) return;
          context.logger.error(loaderError(error));
          if (throwOnError) throw error;
        }
      };

      const refreshForReport = (changedPath: string) => {
        if (reportPaths.includes(path.resolve(changedPath))) {
          void refresh(false);
        }
      };

      context.watcher?.add(reportPaths);
      context.watcher?.on("change", refreshForReport);
      context.watcher?.on("add", refreshForReport);
      context.watcher?.on("unlink", refreshForReport);

      await refresh(true);
    },
  } satisfies Loader;
}

const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatDecimalBytes(bytes: number): string {
  const magnitude = Math.min(
    Math.floor(Math.log10(Math.max(bytes, 1)) / 3),
    DECIMAL_UNITS.length - 1,
  );
  const value = bytes / 1000 ** magnitude;
  return `${new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value)} ${DECIMAL_UNITS[magnitude]!}`;
}
