/**
 * Type-instantiation gate for `packages/cva`'s authoring types. Compiles
 * each fixture under `packages/cva/test/type-performance/` in isolation
 * against the *built* `packages/cva/dist/*.d.mts` declarations (never
 * `src` — a `src` compile bundles in the runtime program's own cost, which
 * moves on every unrelated refactor) and compares the reported
 * `tsc --extendedDiagnostics` instantiation count against the committed
 * baseline at `test/bench/type-performance.json`.
 *
 * Two modes:
 * - `--check` (default): fail on any difference from the baseline, in
 *   either direction, on a diagnostic in any fixture, or on a
 *   fixture/baseline mismatch. This is what `pnpm check` runs.
 * - `--update`: recompile every fixture and rewrite the baseline. The
 *   resulting `git diff` is the review artifact — run it by hand
 *   (`pnpm bench:types`) after an authoring-type change and review the
 *   direction of the diff.
 *
 * Every compiler flag that affects instantiation counts is pinned
 * explicitly on the command line (`--types`, `--lib`, `--target`,
 * `--module`, `--moduleResolution`, `--strict`, `--skipLibCheck`), and the
 * installed TypeScript and `tailwind-merge` versions are recorded in the
 * baseline and checked on every run, because both change what gets counted.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const packageDir = path.join(repoRoot, "packages/cva");
const fixturesDir = path.join(packageDir, "test/type-performance");
const baselinePath = path.join(repoRoot, "test/bench/type-performance.json");
const tscBin = path.join(packageDir, "node_modules/.bin/tsc");
const typeRoots = path.join(packageDir, "node_modules/@types");

export const SCHEMA_VERSION = 1;

// Every flag that can change what tsc counts is spelled out here rather
// than left to a tsconfig default, so the count depends only on the
// fixture and the pinned toolchain versions.
const COMPILER_ARGS = [
  "--ignoreConfig",
  "--noEmit",
  "--skipLibCheck",
  "--strict",
  "--target",
  "es2019",
  "--lib",
  "es2019",
  "--module",
  "nodenext",
  "--moduleResolution",
  "nodenext",
  "--extendedDiagnostics",
] as const;

export interface Baseline {
  schemaVersion: number;
  typescript: string;
  tailwindMerge: string;
  fixtures: Record<string, number>;
}

export interface FixtureCompileResult {
  fixture: string;
  instantiations: number | undefined;
  diagnostics: number;
  stdout: string;
}

/* Parsing
  ============================================ */

export function parseArgs(argv: string[]): { mode: "check" | "update" } {
  let mode: "check" | "update" = "check";
  for (const arg of argv) {
    if (arg === "--check" || arg === "--update") {
      mode = arg.slice(2) as "check" | "update";
    } else {
      throw new Error(
        `Unknown argument "${arg}". Expected --check or --update.`,
      );
    }
  }
  return { mode };
}

export function parseInstantiations(stdout: string): number | undefined {
  const match = stdout.match(/^Instantiations:\s*([\d,]+)\s*$/m);
  if (!match) return undefined;
  return Number(match[1].replace(/,/g, ""));
}

export function countDiagnostics(stdout: string): number {
  return (stdout.match(/error TS\d+:/g) ?? []).length;
}

export function listFixtures(
  dir: string,
  readdirImpl: typeof readdirSync = readdirSync,
): string[] {
  return readdirImpl(dir)
    .filter((name) => name.endsWith(".mts"))
    .map((name) => name.slice(0, -".mts".length))
    .sort();
}

export function diffFixtureSets(
  fixtureNames: readonly string[],
  baselineNames: readonly string[],
): { missingFromBaseline: string[]; missingFixtureFile: string[] } {
  const fixtureSet = new Set(fixtureNames);
  const baselineSet = new Set(baselineNames);
  return {
    missingFromBaseline: fixtureNames
      .filter((name) => !baselineSet.has(name))
      .sort(),
    missingFixtureFile: baselineNames
      .filter((name) => !fixtureSet.has(name))
      .sort(),
  };
}

export function checkVersions(
  baseline: Pick<Baseline, "typescript" | "tailwindMerge">,
  installed: { typescript: string; tailwindMerge: string },
): string[] {
  const problems: string[] = [];
  if (baseline.typescript !== installed.typescript) {
    problems.push(
      `TypeScript version mismatch: baseline recorded ${baseline.typescript}, installed is ${installed.typescript}. Re-baseline for TypeScript ${installed.typescript} with \`pnpm bench:types\` after confirming the new counts are intended.`,
    );
  }
  if (baseline.tailwindMerge !== installed.tailwindMerge) {
    problems.push(
      `tailwind-merge version mismatch: baseline recorded ${baseline.tailwindMerge}, installed is ${installed.tailwindMerge}. Re-baseline for tailwind-merge ${installed.tailwindMerge} with \`pnpm bench:types\` after confirming the new counts are intended.`,
    );
  }
  return problems;
}

/* Compiling
  ============================================ */

export interface CompileOptions {
  fixturesDir: string;
  tscBin: string;
  packageDir: string;
  typeRoots: string;
  execImpl: typeof execFileSync;
}

export function compileFixture(
  fixture: string,
  options: CompileOptions,
): FixtureCompileResult {
  const fixturePath = path.join(options.fixturesDir, `${fixture}.mts`);
  const args = [
    ...COMPILER_ARGS,
    "--typeRoots",
    options.typeRoots,
    "--types",
    "node",
    fixturePath,
  ];

  let stdout: string;
  try {
    stdout = options.execImpl(options.tscBin, args, {
      cwd: options.packageDir,
      encoding: "utf8",
    });
  } catch (error) {
    const failure = error as { stdout?: string; message?: string };
    stdout = failure.stdout ?? failure.message ?? "";
  }

  return {
    fixture,
    instantiations: parseInstantiations(stdout),
    diagnostics: countDiagnostics(stdout),
    stdout,
  };
}

/* Check / update
  ============================================ */

export function check(
  fixtureNames: readonly string[],
  baseline: Baseline,
  compile: (fixture: string) => FixtureCompileResult,
): string[] {
  const problems: string[] = [];
  const { missingFromBaseline, missingFixtureFile } = diffFixtureSets(
    fixtureNames,
    Object.keys(baseline.fixtures),
  );

  for (const name of missingFromBaseline) {
    problems.push(
      `Fixture "${name}" has no entry in the baseline. Run \`pnpm bench:types\` to add it.`,
    );
  }
  for (const name of missingFixtureFile) {
    problems.push(
      `Baseline entry "${name}" has no matching fixture file. Run \`pnpm bench:types\` to remove it.`,
    );
  }

  for (const name of fixtureNames) {
    if (!(name in baseline.fixtures)) continue; // already reported above

    const result = compile(name);
    if (result.diagnostics > 0) {
      problems.push(
        `Fixture "${name}" produced ${result.diagnostics} tsc diagnostic(s), which would otherwise silently pass with a lower (broken) instantiation count:\n${result.stdout}`,
      );
      continue;
    }
    if (result.instantiations === undefined) {
      problems.push(
        `Fixture "${name}" did not report an instantiation count (tsc output changed, or tsc failed to run):\n${result.stdout}`,
      );
      continue;
    }

    const expected = baseline.fixtures[name];
    if (result.instantiations !== expected) {
      const delta = result.instantiations - expected;
      problems.push(
        `Fixture "${name}" instantiation count changed: expected ${expected}, measured ${result.instantiations} (${delta > 0 ? "+" : ""}${delta}). If this is an intended consequence of a types change, run \`pnpm bench:types\` and review the baseline diff.`,
      );
    }
  }

  return problems;
}

export function update(
  fixtureNames: readonly string[],
  compile: (fixture: string) => FixtureCompileResult,
  installed: { typescript: string; tailwindMerge: string },
): { baseline: Baseline; problems: string[] } {
  const problems: string[] = [];
  const fixtures: Record<string, number> = {};

  for (const name of fixtureNames) {
    const result = compile(name);
    if (result.diagnostics > 0) {
      problems.push(
        `Fixture "${name}" produced ${result.diagnostics} tsc diagnostic(s); refusing to bake a broken count into the baseline:\n${result.stdout}`,
      );
      continue;
    }
    if (result.instantiations === undefined) {
      problems.push(
        `Fixture "${name}" did not report an instantiation count (tsc output changed, or tsc failed to run):\n${result.stdout}`,
      );
      continue;
    }
    fixtures[name] = result.instantiations;
  }

  return {
    baseline: {
      schemaVersion: SCHEMA_VERSION,
      typescript: installed.typescript,
      tailwindMerge: installed.tailwindMerge,
      fixtures,
    },
    problems,
  };
}

/* CLI
  ============================================ */

export interface MainOptions {
  argv?: string[];
  execImpl?: typeof execFileSync;
  readFileImpl?: typeof readFileSync;
  writeFileImpl?: typeof writeFileSync;
  existsImpl?: typeof existsSync;
  readdirImpl?: typeof readdirSync;
}

export function main({
  argv = process.argv.slice(2),
  execImpl = execFileSync,
  readFileImpl = readFileSync,
  writeFileImpl = writeFileSync,
  existsImpl = existsSync,
  readdirImpl = readdirSync,
}: MainOptions = {}): number {
  try {
    const { mode } = parseArgs(argv);

    if (!existsImpl(path.join(packageDir, "dist/index.mjs"))) {
      console.error(
        "type-performance: packages/cva/dist/index.mjs is missing — run `pnpm --filter cva build` first.",
      );
      return 1;
    }

    const installed = {
      typescript: (
        JSON.parse(
          readFileImpl(
            path.join(packageDir, "node_modules/typescript/package.json"),
            "utf8",
          ),
        ) as { version: string }
      ).version,
      tailwindMerge: (
        JSON.parse(
          readFileImpl(
            path.join(packageDir, "node_modules/tailwind-merge/package.json"),
            "utf8",
          ),
        ) as { version: string }
      ).version,
    };

    const fixtureNames = listFixtures(fixturesDir, readdirImpl);
    const compile = (fixture: string) =>
      compileFixture(fixture, {
        fixturesDir,
        tscBin,
        packageDir,
        typeRoots,
        execImpl,
      });

    if (mode === "update") {
      const { baseline, problems } = update(fixtureNames, compile, installed);
      if (problems.length > 0) {
        console.error(`type-performance: ${problems.join("\n\n")}`);
        return 1;
      }
      writeFileImpl(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
      console.log(
        `type-performance: wrote ${fixtureNames.length} fixture count(s) to ${baselinePath}.`,
      );
      for (const name of fixtureNames) {
        console.log(`  ${name}: ${baseline.fixtures[name]}`);
      }
      return 0;
    }

    const baseline = JSON.parse(readFileImpl(baselinePath, "utf8")) as Baseline;

    const versionProblems = checkVersions(baseline, installed);
    if (versionProblems.length > 0) {
      console.error(`type-performance: ${versionProblems.join("\n")}`);
      return 1;
    }

    const problems = check(fixtureNames, baseline, compile);
    if (problems.length > 0) {
      console.error(
        `type-performance: ${problems.length} fixture(s) failed:\n\n${problems.join("\n\n")}`,
      );
      return 1;
    }

    console.log(
      `type-performance: all ${fixtureNames.length} fixtures match the committed baseline.`,
    );
    return 0;
  } catch (error) {
    console.error(`type-performance: ${(error as Error).message}`);
    return 1;
  }
}

/* v8 ignore start -- process entrypoint (`pnpm check:type-performance` /
   `pnpm bench:types`); subprocess coverage isn't collected. */
function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  process.exitCode = main();
}
/* v8 ignore stop */
