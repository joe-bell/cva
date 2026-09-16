import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export interface BundleSizeSource {
  package: string;
  packageDirectory: string;
  entry: string;
}

export const BUNDLE_SIZE_SOURCES = [
  {
    package: "class-variance-authority",
    packageDirectory: path.join(
      REPOSITORY_ROOT,
      "packages/class-variance-authority",
    ),
    entry: "dist/index.js",
  },
  {
    package: "cva",
    packageDirectory: path.join(REPOSITORY_ROOT, "packages/cva"),
    entry: "dist/index.cjs",
  },
] as const satisfies readonly BundleSizeSource[];

export type BundleSizePackage = (typeof BUNDLE_SIZE_SOURCES)[number]["package"];

export const BUNDLE_SIZE_ARTIFACT_PATH = path.join(
  REPOSITORY_ROOT,
  "docs/.generated/bundle-sizes.json",
);
