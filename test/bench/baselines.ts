/**
 * Resolves each workspace package's latest stable (`latest`) and prerelease
 * (`beta`) npm dist-tags, then installs each one outside the pnpm workspace
 * (so the workspace `overrides` that pin `cva` and
 * `class-variance-authority` to `workspace:*` don't silently override the
 * install) and writes a manifest describing what's available to benchmark
 * against.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGES = ["cva", "class-variance-authority"];
const LABELS = ["release", "prerelease"] as const;

type Label = (typeof LABELS)[number];

export interface ManifestEntry {
  package: string;
  label: Label;
  version: string;
  dir?: string;
  skipped?: string;
}

function parseArgs(argv: string[]) {
  let out = path.join(tmpdir(), "cva-bench-baselines");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { out };
}

interface ResolvedVersion {
  label: Label;
  version: string;
  skipped?: string;
}

const DIST_TAGS: Record<Label, string> = {
  release: "latest",
  prerelease: "beta",
};

export async function resolvePackageVersions(
  pkg: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedVersion[]> {
  let response: Response;
  try {
    response = await fetchImpl(
      `https://registry.npmjs.org/${encodeURIComponent(pkg)}`,
    );
  } catch (error) {
    return LABELS.map((label) => ({
      label,
      version: "unknown",
      skipped: `failed to resolve npm dist-tags: ${(error as Error).message}`,
    }));
  }

  if (!response.ok) {
    return LABELS.map((label) => ({
      label,
      version: "unknown",
      skipped: `npm registry returned ${response.status} ${response.statusText}`,
    }));
  }

  let distTags: unknown;
  try {
    distTags = ((await response.json()) as Record<string, unknown>)[
      "dist-tags"
    ];
  } catch (error) {
    return LABELS.map((label) => ({
      label,
      version: "unknown",
      skipped: `failed to parse npm dist-tags: ${(error as Error).message}`,
    }));
  }

  return LABELS.map((label) => {
    const version =
      typeof distTags === "object" && distTags !== null
        ? (distTags as Record<string, unknown>)[DIST_TAGS[label]]
        : undefined;
    if (typeof version === "string" && version.length > 0) {
      return { label, version };
    }
    return {
      label,
      version: "unknown",
      skipped: `no ${DIST_TAGS[label]} dist-tag on npm`,
    };
  });
}

function rootPackageManager(): string {
  const rootPkgJson = JSON.parse(readFileSync("package.json", "utf8"));
  return rootPkgJson.packageManager;
}

function installBaseline(pkg: string, version: string, dir: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: `bench-baseline-${pkg}`,
        private: true,
        // Matches the root package's pin (not hardcoded) so corepack
        // resolves the same pnpm version here as everywhere else in CI —
        // see rootPackageManager().
        packageManager: rootPackageManager(),
      },
      null,
      2,
    ),
  );
  execFileSync("pnpm", ["add", `${pkg}@${version}`, "--ignore-workspace"], {
    cwd: dir,
    stdio: "inherit",
  });
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  mkdirSync(out, { recursive: true });

  const entries: ManifestEntry[] = [];

  for (const pkg of PACKAGES) {
    const versions = await resolvePackageVersions(pkg);
    for (const resolved of versions) {
      if (resolved.skipped) {
        entries.push({ package: pkg, ...resolved });
        continue;
      }

      const dirName = `${pkg}-${resolved.label}`;
      try {
        installBaseline(pkg, resolved.version, path.join(out, dirName));
        entries.push({ package: pkg, ...resolved, dir: dirName });
      } catch (error) {
        entries.push({
          package: pkg,
          ...resolved,
          skipped: `failed to install: ${(error as Error).message}`,
        });
      }
    }
  }

  writeFileSync(
    path.join(out, "manifest.json"),
    JSON.stringify({ schemaVersion: 1, entries }, null, 2),
  );

  console.log(`Wrote baseline manifest to ${path.join(out, "manifest.json")}`);
  for (const entry of entries) {
    console.log(
      `  ${entry.package} ${entry.label}@${entry.version}: ${entry.skipped ?? "installed"}`,
    );
  }
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  await main();
}
