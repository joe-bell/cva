/**
 * Resolves the latest published release and prerelease versions of each
 * workspace package from GitHub Releases, then installs each one outside
 * the pnpm workspace (so the workspace `overrides` that pin `cva` and
 * `class-variance-authority` to `workspace:*` don't silently override the
 * install) and writes a manifest describing what's available to benchmark
 * against.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const REPO_OWNER = "joe-bell";
const REPO_NAME = "cva";
const PACKAGES = ["cva", "class-variance-authority"];
const LABELS = ["release", "prerelease"] as const;

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
}

interface ManifestEntry {
  package: string;
  label: "release" | "prerelease";
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

async function fetchLatestReleases(): Promise<
  Record<"release" | "prerelease", string | undefined>
> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "cva-benchmark-ci",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=30`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to list GitHub releases: ${response.status} ${response.statusText}`,
    );
  }

  const releases = (await response.json()) as GitHubRelease[];
  const release = releases.find((r) => !r.draft && !r.prerelease);
  const prerelease = releases.find((r) => !r.draft && r.prerelease);

  return {
    release: release?.tag_name.replace(/^v/, ""),
    prerelease: prerelease?.tag_name.replace(/^v/, ""),
  };
}

async function isPublishedOnNpm(
  pkg: string,
  version: string,
): Promise<boolean> {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(pkg)}/${encodeURIComponent(version)}`,
  );
  return response.ok;
}

function installBaseline(pkg: string, version: string, dir: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: `bench-baseline-${pkg}`,
        private: true,
        packageManager: "pnpm@11.0.9",
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

  const latest = await fetchLatestReleases();
  const entries: ManifestEntry[] = [];

  for (const pkg of PACKAGES) {
    for (const label of LABELS) {
      const version = latest[label];
      if (!version) {
        entries.push({
          package: pkg,
          label,
          version: "unknown",
          skipped: `no ${label} found on GitHub`,
        });
        continue;
      }

      const published = await isPublishedOnNpm(pkg, version);
      if (!published) {
        entries.push({
          package: pkg,
          label,
          version,
          skipped: "not published on npm",
        });
        continue;
      }

      const dirName = `${pkg}-${label}`;
      try {
        installBaseline(pkg, version, path.join(out, dirName));
        entries.push({ package: pkg, label, version, dir: dirName });
      } catch (error) {
        entries.push({
          package: pkg,
          label,
          version,
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

await main();
