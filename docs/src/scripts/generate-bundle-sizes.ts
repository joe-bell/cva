import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  BUNDLE_SIZE_ARTIFACT_PATH,
  BUNDLE_SIZE_SOURCES,
  type BundleSizeSource,
} from "../lib/bundle-size-sources.ts";

const require = createRequire(import.meta.url);

export interface BundleSizeData {
  passed: true;
  size: number;
  sizeLimit: number;
}

export interface CommandResult {
  code: number | null;
  spawnError?: Error;
  stderr: string;
  stdout: string;
}

export type RunCommand = (
  command: string,
  args: string[],
  options: { cwd: string },
) => Promise<CommandResult>;

export type ResolveModule = (
  specifier: string,
  options: { paths: string[] },
) => string;

export interface FileOperations {
  createDirectory: (
    directory: string,
    options: { recursive: true },
  ) => Promise<string | undefined>;
  createTemporaryName: () => string;
  move: (from: string, to: string) => Promise<void>;
  remove: (target: string, options: { force: true }) => Promise<void>;
  write: (file: string, contents: string) => Promise<void>;
}

export function sizeLimitCliPath(
  packageDirectory: string,
  resolve: ResolveModule = require.resolve,
): string {
  const manifestPath = resolve("size-limit/package.json", {
    paths: [packageDirectory],
  });
  return path.join(path.dirname(manifestPath), "bin.js");
}

export function runCommand(
  command: string,
  args: string[],
  { cwd }: { cwd: string },
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let spawnError: Error | undefined;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code) => {
      resolve(
        spawnError === undefined
          ? { code, stderr, stdout }
          : { code, spawnError, stderr, stdout },
      );
    });
  });
}

export function parseSizeLimitOutput(output: string): unknown[] {
  let report: unknown;

  try {
    report = JSON.parse(output);
  } catch {
    throw new Error("Size Limit did not produce valid JSON.");
  }

  if (!Array.isArray(report) || report.length === 0) {
    throw new Error("Size Limit did not produce a nonempty JSON report.");
  }

  return report;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function selectRootBundleSize(
  source: BundleSizeSource,
  report: unknown[],
): BundleSizeData {
  const matches = report.filter(
    (result): result is Record<string, unknown> =>
      isRecord(result) && result.name === source.entry,
  );

  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${source.entry} result for ${source.package}.`,
    );
  }

  const { passed, size, sizeLimit } = matches[0]!;
  if (
    passed !== true ||
    !isPositiveInteger(size) ||
    !isPositiveInteger(sizeLimit) ||
    size > sizeLimit
  ) {
    throw new Error(
      `Size Limit produced an invalid root result for ${source.package}.`,
    );
  }

  return { passed: true, size, sizeLimit };
}

function commandError(source: BundleSizeSource, result: CommandResult): Error {
  const details = [result.spawnError?.message, result.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  const message = `Size Limit failed for ${source.package} with exit code ${result.code}.`;

  return new Error(details ? `${message}\n${details}` : message);
}

export async function measurePackageBundleSize(
  source: BundleSizeSource,
  {
    command = runCommand,
    resolveCliPath = sizeLimitCliPath,
  }: {
    command?: RunCommand | undefined;
    resolveCliPath?: typeof sizeLimitCliPath | undefined;
  } = {},
): Promise<BundleSizeData> {
  const result = await command(
    process.execPath,
    [resolveCliPath(source.packageDirectory), "--json"],
    { cwd: source.packageDirectory },
  );

  if (result.code !== 0) throw commandError(source, result);

  return selectRootBundleSize(source, parseSizeLimitOutput(result.stdout));
}

export async function measureBundleSizes(
  sources: readonly BundleSizeSource[] = BUNDLE_SIZE_SOURCES,
  options: {
    command?: RunCommand | undefined;
    resolveCliPath?: typeof sizeLimitCliPath | undefined;
  } = {},
): Promise<Record<string, BundleSizeData>> {
  const entries = await Promise.all(
    sources.map(async (source) => [
      source.package,
      await measurePackageBundleSize(source, options),
    ]),
  );

  return Object.fromEntries(entries);
}

export async function invalidateBundleSizeArtifact(
  artifactPath: string = BUNDLE_SIZE_ARTIFACT_PATH,
  { remove = rm }: Pick<Partial<FileOperations>, "remove"> = {},
): Promise<void> {
  await remove(artifactPath, { force: true });
}

export async function writeBundleSizesAtomically(
  artifactPath: string,
  bundleSizes: Record<string, BundleSizeData>,
  {
    createDirectory = mkdir,
    createTemporaryName = randomUUID,
    move = rename,
    remove = rm,
    write = writeFile,
  }: Partial<FileOperations> = {},
): Promise<void> {
  const temporaryPath = `${artifactPath}.${createTemporaryName()}.tmp`;

  try {
    await createDirectory(path.dirname(artifactPath), { recursive: true });
    await write(temporaryPath, `${JSON.stringify(bundleSizes, null, 2)}\n`);
    await move(temporaryPath, artifactPath);
  } catch (error) {
    await remove(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export interface GenerateBundleSizesOptions {
  artifactPath?: string;
  command?: RunCommand;
  fileOperations?: Partial<FileOperations>;
  resolveCliPath?: typeof sizeLimitCliPath;
  sources?: readonly BundleSizeSource[];
}

export async function generateBundleSizes({
  artifactPath = BUNDLE_SIZE_ARTIFACT_PATH,
  command,
  fileOperations,
  resolveCliPath,
  sources = BUNDLE_SIZE_SOURCES,
}: GenerateBundleSizesOptions = {}): Promise<Record<string, BundleSizeData>> {
  await invalidateBundleSizeArtifact(artifactPath, fileOperations);
  const bundleSizes = await measureBundleSizes(sources, {
    command,
    resolveCliPath,
  });
  await writeBundleSizesAtomically(artifactPath, bundleSizes, fileOperations);
  return bundleSizes;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function main(
  options: GenerateBundleSizesOptions = {},
  errorWriter: (message: string) => void = process.stderr.write.bind(
    process.stderr,
  ),
): Promise<number> {
  try {
    await generateBundleSizes(options);
    return 0;
  } catch (error) {
    errorWriter(`Could not generate bundle sizes: ${errorMessage(error)}\n`);
    return 1;
  }
}

/* v8 ignore start -- requires invoking this module as Node's entrypoint. */
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main();
}
/* v8 ignore stop */
