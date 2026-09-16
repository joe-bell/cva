import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export const REPORT_FILENAME = "bundle-size.json";

export function sizeLimitCliPath(packageDir, resolve = require.resolve) {
  const manifestPath = resolve("size-limit/package.json", {
    paths: [packageDir],
  });
  return path.join(path.dirname(manifestPath), "bin.js");
}

export function runCommand(command, args, { cwd }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let spawnError;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code) => {
      resolve({ code, stdout, stderr, spawnError });
    });
  });
}

export function parseSizeLimitReport(output) {
  const report = JSON.parse(output);
  if (Array.isArray(report) && report.length > 0) return report;
  if (
    report !== null &&
    typeof report === "object" &&
    typeof report.error === "string"
  ) {
    return report;
  }
  throw new Error("Size Limit did not produce a nonempty JSON report.");
}

export async function clearBundleSizeReport(packageDir) {
  await rm(path.join(packageDir, REPORT_FILENAME), { force: true });
}

export async function writeReportAtomically(
  reportPath,
  report,
  { move = rename, remove = rm, write = writeFile } = {},
) {
  const temporaryPath = `${reportPath}.${randomUUID()}.tmp`;

  try {
    await write(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
    await move(temporaryPath, reportPath);
  } catch (error) {
    try {
      await remove(temporaryPath, { force: true });
    } catch {}
    throw error;
  }
}

function failureExitCode(result) {
  return typeof result.code === "number" && result.code > 0 ? result.code : 1;
}

function resultCode(result) {
  return String(result.code);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(size) {
  return `${Number(size).toLocaleString("en-US")} B`;
}

function reportError(result, error) {
  const spawnError = result.spawnError
    ? `\n${errorMessage(result.spawnError)}`
    : "";
  const stderr = result.stderr.trim();
  return {
    error: `${errorMessage(error)}${spawnError}${stderr ? `\n${stderr}` : ""}`,
  };
}

function failureMessage(packageDir, result, report) {
  if (!Array.isArray(report)) {
    return `Size Limit failed for ${packageDir}: ${report.error} Size Limit exited with code ${resultCode(result)}.\n`;
  }

  const failedResults = report.filter(({ passed }) => passed === false);
  const detail = failedResults.length
    ? failedResults
        .map(
          ({ name, size, sizeLimit }) =>
            `${name}: ${size} bytes (limit ${sizeLimit} bytes).`,
        )
        .join(" ")
    : "Size Limit did not report a budget failure.";
  return `Size Limit failed for ${packageDir}: ${detail} Size Limit exited with code ${resultCode(result)}.\n`;
}

function sizeLimitSummary(report) {
  return report
    .map(({ name, size, sizeLimit }) => {
      const measurement = `${name}: ${formatBytes(size)}`;
      if (typeof sizeLimit !== "number") return `${measurement}\n`;

      return `${measurement} / ${formatBytes(sizeLimit)} (${formatBytes(sizeLimit - size)} headroom)\n`;
    })
    .join("");
}

export async function writeBundleSizeReport(
  packageDir = process.cwd(),
  {
    command = runCommand,
    errorWriter = process.stderr.write.bind(process.stderr),
    outputWriter = process.stdout.write.bind(process.stdout),
    resolveCliPath = sizeLimitCliPath,
    writeReport = writeReportAtomically,
  } = {},
) {
  const reportPath = path.join(packageDir, REPORT_FILENAME);
  await clearBundleSizeReport(packageDir);

  const result = await command(
    process.execPath,
    [resolveCliPath(packageDir), "--json"],
    { cwd: packageDir },
  );
  let report;

  try {
    report = parseSizeLimitReport(result.stdout);
  } catch (error) {
    report = reportError(result, error);
  }

  await writeReport(reportPath, report);

  const succeeded =
    Array.isArray(report) &&
    result.code === 0 &&
    !report.some(({ passed }) => passed === false);
  if (succeeded) {
    outputWriter(sizeLimitSummary(report));
    return 0;
  }

  errorWriter(failureMessage(packageDir, result, report));
  return failureExitCode(result);
}

export async function main(
  options = {},
  errorWriter = process.stderr.write.bind(process.stderr),
) {
  try {
    return await writeBundleSizeReport(process.cwd(), {
      ...options,
      errorWriter: options.errorWriter ?? errorWriter,
    });
  } catch (error) {
    errorWriter(`Could not write Size Limit report: ${errorMessage(error)}\n`);
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
