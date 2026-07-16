/**
 * Converts a `vitest bench --outputJson` report plus the baselines manifest
 * (see test/bench/scripts/baselines.ts) into one minimal, stable
 * `benchmark-<package>.json` file per workspace package. This is the only
 * schema that crosses the trust boundary into the privileged sticky-comment
 * workflow (see test/bench/scripts/compare.ts), so it deliberately carries nothing
 * beyond what's needed to render a table.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import type { ManifestEntry } from "./baselines";
import {
  sanitizeSkippedReason,
  type Implementation,
  type Task,
} from "./compare.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

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

export function parseArgs(argv: string[]) {
  let vitestJson = path.join(repoRoot, "test/bench/.output/vitest-bench.json");
  let baselinesDir = process.env.BENCH_BASELINES_DIR;
  let outDir = path.join(repoRoot, "test/bench/.output");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--vitest-json" && argv[i + 1]) vitestJson = argv[++i];
    if (argv[i] === "--baselines" && argv[i + 1]) baselinesDir = argv[++i];
    if (argv[i] === "--out" && argv[i + 1]) outDir = argv[++i];
  }
  return { vitestJson, baselinesDir, outDir };
}

export function packageNameFromFilepath(filepath: string): string | undefined {
  const basename = path.basename(filepath, ".bench.ts");
  return PACKAGES.includes(basename) ? basename : undefined;
}

export function localVersion(pkg: string): string {
  const pkgJsonPath = path.join(repoRoot, "packages", pkg, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  return pkgJson.version;
}

export function gitSha(execImpl: typeof execFileSync = execFileSync): string {
  try {
    return execImpl("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export function findGroup(
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

export function toTasks(group: VitestGroup): Task[] {
  return group.benchmarks.map((b) => ({
    name: b.name,
    hz: b.hz,
    mean: b.mean,
    rme: b.rme,
    samples: b.sampleCount,
  }));
}

export function main(argv: string[] = process.argv.slice(2)) {
  const { vitestJson, baselinesDir, outDir } = parseArgs(argv);

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
    const localVersionValue = localVersion(pkg);
    implementations.push(
      localGroup
        ? {
            label: "local",
            version: localVersionValue,
            tasks: toTasks(localGroup),
          }
        : {
            label: "local",
            version: localVersionValue,
            skipped: "no local benchmark results found",
          },
    );

    for (const entry of manifestEntries.filter((e) => e.package === pkg)) {
      if (entry.skipped) {
        implementations.push({
          label: entry.label,
          version: entry.version,
          // Baseline skip reasons carry tool-generated text (e.g. a failed
          // `pnpm add` mentioning `pkg@version` or a registry URL); sanitize
          // so they can't trip compare.ts's skip-reason allowlist and
          // suppress the whole comment. See sanitizeSkippedReason.
          skipped: sanitizeSkippedReason(entry.skipped),
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

/* v8 ignore start -- process entrypoint, exercised by `node
   test/bench/scripts/report.ts` in CI; subprocess coverage isn't collected. */
function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  main();
}
/* v8 ignore stop */
