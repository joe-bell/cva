/**
 * Resolves each workspace package's published npm dist-tags, then installs each
 * one outside the pnpm workspace (so the workspace `overrides` that pin `cva`
 * and `class-variance-authority` to `workspace:*` don't silently override the
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
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

type Label = (typeof LABELS)[number];

export interface ManifestEntry {
  package: string;
  label: Label;
  version: string;
  dir?: string;
  skipped?: string;
}

export function parseArgs(argv: string[]) {
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

/**
 * Which npm dist-tags carry meaningful baselines per package. `cva` keeps
 * `latest` at 0.0.0 so it doesn't overwrite stable — only `beta` is
 * comparable. `class-variance-authority` publishes stable to `latest` and has
 * no `beta` dist-tag.
 */
const PACKAGE_BASELINES: Record<string, readonly Label[]> = {
  cva: ["prerelease"],
  "class-variance-authority": ["release"],
};

const PLACEHOLDER_VERSIONS = new Set(["0.0.0"]);

function packageBaselineLabels(pkg: string): readonly Label[] {
  return PACKAGE_BASELINES[pkg] ?? LABELS;
}

function skippedForLabels(
  labels: readonly Label[],
  reason: string,
): ResolvedVersion[] {
  return labels.map((label) => ({
    label,
    version: "unknown",
    skipped: reason,
  }));
}

export async function resolvePackageVersions(
  pkg: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedVersion[]> {
  const labels = packageBaselineLabels(pkg);

  let response: Response;
  try {
    response = await fetchImpl(
      `https://registry.npmjs.org/${encodeURIComponent(pkg)}`,
      // The abbreviated packument still carries `dist-tags` but omits the
      // full per-version metadata, so we don't download megabytes just to
      // read two tags.
      { headers: { Accept: "application/vnd.npm.install-v1+json" } },
    );
  } catch (error) {
    return skippedForLabels(
      labels,
      `failed to resolve npm dist-tags: ${(error as Error).message}`,
    );
  }

  if (!response.ok) {
    return skippedForLabels(
      labels,
      `npm registry returned ${response.status} ${response.statusText}`,
    );
  }

  let distTags: unknown;
  try {
    distTags = ((await response.json()) as Record<string, unknown>)[
      "dist-tags"
    ];
  } catch (error) {
    return skippedForLabels(
      labels,
      `failed to parse npm dist-tags: ${(error as Error).message}`,
    );
  }

  return labels.map((label) => {
    const distTag = DIST_TAGS[label];
    const version =
      typeof distTags === "object" && distTags !== null
        ? (distTags as Record<string, unknown>)[distTag]
        : undefined;
    if (typeof version !== "string" || version.length === 0) {
      return {
        label,
        version: "unknown",
        skipped: `no ${distTag} dist-tag on npm`,
      };
    }
    if (PLACEHOLDER_VERSIONS.has(version)) {
      return {
        label,
        version,
        skipped: `${distTag} dist-tag points at placeholder version ${version}`,
      };
    }
    return { label, version };
  });
}

export function rootPackageManager(): string {
  const rootPkgJson = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
  return rootPkgJson.packageManager;
}

export function installBaseline(
  pkg: string,
  version: string,
  dir: string,
  execImpl: typeof execFileSync = execFileSync,
) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: `bench-baseline-${pkg}`,
        private: true,
        // Matches the root package's pin (not hardcoded) so corepack
        // resolves the same pnpm version here as everywhere else in CI —
        // see rootPackageManager(). `--ignore-scripts` keeps npm lifecycle
        // scripts in baseline packages from running in the untrusted CI job.
        packageManager: rootPackageManager(),
      },
      null,
      2,
    ),
  );
  execImpl(
    "pnpm",
    ["add", `${pkg}@${version}`, "--ignore-workspace", "--ignore-scripts"],
    {
      cwd: dir,
      stdio: "inherit",
    },
  );
}

export async function main(
  argv: string[] = process.argv.slice(2),
  {
    fetchImpl = fetch,
    execImpl = execFileSync,
  }: { fetchImpl?: typeof fetch; execImpl?: typeof execFileSync } = {},
) {
  const { out } = parseArgs(argv);
  mkdirSync(out, { recursive: true });

  const entries: ManifestEntry[] = [];

  for (const pkg of PACKAGES) {
    const versions = await resolvePackageVersions(pkg, fetchImpl);
    for (const resolved of versions) {
      if (resolved.skipped) {
        entries.push({ package: pkg, ...resolved });
        continue;
      }

      const dirName = `${pkg}-${resolved.label}`;
      try {
        installBaseline(
          pkg,
          resolved.version,
          path.join(out, dirName),
          execImpl,
        );
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

/* v8 ignore start -- process entrypoint, exercised by `pnpm bench:baselines`
   in CI; subprocess coverage isn't collected. */
function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  await main();
}
/* v8 ignore stop */
