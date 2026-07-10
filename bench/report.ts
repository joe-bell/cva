/**
 * Converts a `vitest bench --outputJson` report plus the baselines manifest
 * (see bench/baselines.ts) into one minimal, stable `benchmark-<package>.json`
 * file per workspace package. This is the only schema that crosses the trust
 * boundary into the privileged sticky-comment workflow (see bench/compare.ts),
 * so it deliberately carries nothing beyond what's needed to render a table.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PACKAGES = ["cva", "class-variance-authority"];

interface VitestBenchmark {
  name: string;
  hz: number;
  mean: number;
  rme: number;
  sampleCount: number;
}

interface VitestGroup {
  fullName: string;
  benchmarks: VitestBenchmark[];
}

interface VitestFile {
  filepath: string;
  groups: VitestGroup[];
}

interface VitestReport {
  files: VitestFile[];
}

interface ManifestEntry {
  package: string;
  label: "release" | "prerelease";
  version: string;
  dir?: string;
  skipped?: string;
}

interface Task {
  name: string;
  hz: number;
  mean: number;
  rme: number;
  samples: number;
}

interface Implementation {
  label: string;
  version: string;
  tasks?: Task[];
  skipped?: string;
}

function parseArgs(argv: string[]) {
  let vitestJson = "bench-results/vitest-bench.json";
  let baselinesDir = process.env.BENCH_BASELINES_DIR;
  let outDir = "bench-results";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--vitest-json" && argv[i + 1]) vitestJson = argv[++i];
    if (argv[i] === "--baselines" && argv[i + 1]) baselinesDir = argv[++i];
    if (argv[i] === "--out" && argv[i + 1]) outDir = argv[++i];
  }
  return { vitestJson, baselinesDir, outDir };
}

function packageNameFromFilepath(filepath: string): string | undefined {
  const segments = filepath.split(path.sep);
  const index = segments.indexOf("packages");
  const candidate = index >= 0 ? segments[index + 1] : undefined;
  return PACKAGES.includes(candidate ?? "") ? candidate : undefined;
}

function localVersion(pkg: string): string {
  const pkgJsonPath = path.join("packages", pkg, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  return pkgJson.version;
}

function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function findGroup(
  files: VitestFile[],
  pkg: string,
  describeName: string,
): VitestGroup | undefined {
  for (const file of files) {
    if (packageNameFromFilepath(file.filepath) !== pkg) continue;
    const group = file.groups.find((g) =>
      g.fullName.endsWith(`> ${describeName}`),
    );
    if (group) return group;
  }
  return undefined;
}

function toTasks(group: VitestGroup): Task[] {
  return group.benchmarks.map((b) => ({
    name: b.name,
    hz: b.hz,
    mean: b.mean,
    rme: b.rme,
    samples: b.sampleCount,
  }));
}

function main() {
  const { vitestJson, baselinesDir, outDir } = parseArgs(process.argv.slice(2));

  const report: VitestReport = JSON.parse(readFileSync(vitestJson, "utf8"));

  let manifestEntries: ManifestEntry[] = [];
  if (baselinesDir) {
    const manifestPath = path.join(baselinesDir, "manifest.json");
    if (existsSync(manifestPath)) {
      manifestEntries = JSON.parse(readFileSync(manifestPath, "utf8")).entries;
    }
  }

  mkdirSync(outDir, { recursive: true });

  const commit = gitSha();
  const timestamp = new Date().toISOString();

  for (const pkg of PACKAGES) {
    const implementations: Implementation[] = [];

    const localGroup = findGroup(report.files, pkg, "local");
    implementations.push({
      label: "local",
      version: localVersion(pkg),
      tasks: localGroup ? toTasks(localGroup) : undefined,
      skipped: localGroup ? undefined : "no local benchmark results found",
    });

    for (const entry of manifestEntries.filter((e) => e.package === pkg)) {
      if (entry.skipped) {
        implementations.push({
          label: entry.label,
          version: entry.version,
          skipped: entry.skipped,
        });
        continue;
      }

      const group = findGroup(
        report.files,
        pkg,
        `${entry.label}@${entry.version}`,
      );
      if (!group) {
        implementations.push({
          label: entry.label,
          version: entry.version,
          skipped: "benchmark scenarios failed to run against this version",
        });
        continue;
      }

      implementations.push({
        label: entry.label,
        version: entry.version,
        tasks: toTasks(group),
      });
    }

    const outPath = path.join(outDir, `benchmark-${pkg}.json`);
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          package: pkg,
          node: process.version,
          os: `${os.platform()} ${os.arch()}`,
          commit,
          timestamp,
          implementations,
        },
        null,
        2,
      ),
    );
    console.log(`Wrote ${outPath}`);
  }
}

main();
