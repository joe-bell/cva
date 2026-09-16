import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Loader } from "astro/loaders";
import { z } from "astro/zod";

import {
  BUNDLE_SIZE_ARTIFACT_PATH,
  BUNDLE_SIZE_SOURCES,
  type BundleSizePackage,
} from "./bundle-size-sources.ts";

export {
  BUNDLE_SIZE_ARTIFACT_PATH,
  BUNDLE_SIZE_SOURCES,
  type BundleSizePackage,
};

export const bundleSizeSchema = z
  .object({
    passed: z.literal(true),
    size: z.int().positive(),
    sizeLimit: z.int().positive(),
  })
  .strict()
  .refine(({ size, sizeLimit }) => size <= sizeLimit, {
    message: "Bundle size must not exceed its limit.",
    path: ["size"],
  });

export const bundleSizeArtifactSchema = z
  .record(z.string(), bundleSizeSchema)
  .superRefine((artifact, context) => {
    const hasExpectedPackages =
      Object.keys(artifact).length === BUNDLE_SIZE_SOURCES.length &&
      BUNDLE_SIZE_SOURCES.every(
        ({ package: packageName }) => packageName in artifact,
      );

    if (!hasExpectedPackages) {
      context.addIssue({
        code: "custom",
        message:
          "Bundle size artifact must contain exactly the published packages.",
      });
    }
  });

export type ReadText = (filePath: string) => Promise<string>;

export async function readBundleSizeText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

const readText: ReadText = readBundleSizeText;

export function parseBundleSizeArtifact(text: string) {
  let artifact: unknown;

  try {
    artifact = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON in bundle size artifact.");
  }

  return bundleSizeArtifactSchema.parse(artifact);
}

export async function readBundleSizeEntries(readTextImpl: ReadText = readText) {
  const artifact = parseBundleSizeArtifact(
    await readTextImpl(BUNDLE_SIZE_ARTIFACT_PATH),
  );

  return BUNDLE_SIZE_SOURCES.map((source) => ({
    id: source.package,
    data: artifact[source.package]!,
  }));
}

export function requiredBundleSizeEntry<T>(
  entry: T | undefined,
  packageName: BundleSizePackage,
): T {
  if (entry === undefined)
    throw new Error(`Missing ${packageName} bundle size report.`);
  return entry;
}

export function bundleSizeLoader({
  readTextImpl = readText,
}: {
  readTextImpl?: ReadText;
} = {}) {
  let refreshVersion = 0;

  return {
    name: "bundle-size",
    async load(context) {
      const refresh = async (throwOnError: boolean) => {
        const version = ++refreshVersion;

        try {
          const entries = await readBundleSizeEntries(readTextImpl);
          const parsedEntries = await Promise.all(
            entries.map(async ({ id, data }) => ({
              id,
              data: await context.parseData({ id, data }),
            })),
          );
          if (version !== refreshVersion) return;

          context.store.clear();
          for (const entry of parsedEntries) context.store.set(entry);
        } catch (error) {
          if (version !== refreshVersion) return;

          context.store.clear();
          context.logger.error(String(error));
          if (throwOnError) throw error;
        }
      };

      const refreshArtifact = (changedPath: string) => {
        if (path.resolve(changedPath) === BUNDLE_SIZE_ARTIFACT_PATH) {
          void refresh(false);
        }
      };

      if (context.watcher) {
        context.watcher.add([BUNDLE_SIZE_ARTIFACT_PATH]);
        context.watcher.on("add", refreshArtifact);
        context.watcher.on("change", refreshArtifact);
        context.watcher.on("unlink", refreshArtifact);
      }

      await refresh(true);
    },
  } satisfies Loader;
}

const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/** Keeps the measurement and its unit on one line when the prose wraps. */
const NONBREAKING_SPACE = "\u00a0";

export function formatDecimalBytes(bytes: number): string {
  const magnitude = Math.min(
    Math.floor(Math.log10(Math.max(bytes, 1)) / 3),
    DECIMAL_UNITS.length - 1,
  );
  const value = bytes / 1000 ** magnitude;
  return `${new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(value)}${NONBREAKING_SPACE}${DECIMAL_UNITS[magnitude]!}`;
}
