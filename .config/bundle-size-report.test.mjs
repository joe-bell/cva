import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REPORT_FILENAME,
  clearBundleSizeReport,
  main,
  parseSizeLimitReport,
  runCommand,
  sizeLimitCliPath,
  writeBundleSizeReport,
  writeReportAtomically,
} from "./bundle-size-report.mjs";

const directories = [];

async function packageDirectory(prefix = "bundle-size-report-") {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  directories.push(directory);
  return directory;
}

function successfulReport() {
  return [
    {
      name: "dist/index.cjs",
      passed: true,
      size: 1624,
      sizeLimit: 1650,
    },
  ];
}

function testCliPath(packageDir) {
  return path.join(packageDir, "node_modules", "size-limit", "bin.js");
}

function reportOptions(options = {}) {
  return { resolveCliPath: testCliPath, ...options };
}

function writeTestReport(packageDir, options) {
  return writeBundleSizeReport(packageDir, reportOptions(options));
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("sizeLimitCliPath", () => {
  it("resolves the package-local Size Limit JavaScript CLI", () => {
    const resolve = vi.fn(() => "/dependency/size-limit/package.json");

    expect(sizeLimitCliPath("/workspace/package with spaces", resolve)).toBe(
      "/dependency/size-limit/bin.js",
    );
    expect(resolve).toHaveBeenCalledWith("size-limit/package.json", {
      paths: ["/workspace/package with spaces"],
    });
    expect(sizeLimitCliPath(path.join(process.cwd(), "packages/cva"))).toMatch(
      /size-limit[/\\]bin\.js$/,
    );
  });
});

describe("runCommand", () => {
  it("captures direct command output in a directory containing spaces", async () => {
    const directory = await packageDirectory("bundle size report-");
    const result = await runCommand(
      process.execPath,
      [
        "--eval",
        'process.stdout.write(process.cwd()); process.stderr.write("details");',
      ],
      { cwd: directory },
    );

    expect(result).toMatchObject({
      code: 0,
      stdout: directory,
      stderr: "details",
    });
  });

  it("records a failed direct command", async () => {
    const directory = await packageDirectory();
    const result = await runCommand("/missing/size-limit", [], {
      cwd: directory,
    });

    expect(result.code).not.toBe(0);
    expect(result.spawnError).toBeInstanceOf(Error);
  });
});

describe("parseSizeLimitReport", () => {
  it("accepts Size Limit result and operational-error JSON", () => {
    expect(parseSizeLimitReport(JSON.stringify(successfulReport()))).toEqual(
      successfulReport(),
    );
    expect(parseSizeLimitReport('{"error":"missing dist"}')).toEqual({
      error: "missing dist",
    });
  });

  it("rejects empty and non-report JSON", () => {
    expect(() => parseSizeLimitReport("[]")).toThrow(
      "Size Limit did not produce a nonempty JSON report.",
    );
    expect(() => parseSizeLimitReport('{"size":1624}')).toThrow(
      "Size Limit did not produce a nonempty JSON report.",
    );
  });
});

async function manifest(relativePath) {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

describe("report orchestration", () => {
  it("keeps both package builds source-only and measures from bundlesize", async () => {
    for (const packagePath of [
      "../packages/class-variance-authority/package.json",
      "../packages/cva/package.json",
    ]) {
      const { scripts } = await manifest(packagePath);

      expect(scripts).toMatchObject({
        build: "tsdown",
        "build:size-limit": "node ../../.config/bundle-size-report.mjs",
        bundlesize: "pnpm run build && pnpm run build:size-limit",
      });
      expect(scripts).not.toHaveProperty("build:clear-size-limit");
      expect(scripts).not.toHaveProperty("build:source");
    }
  });

  it("compiles source without Size Limit from the root build and prepare", async () => {
    const { scripts } = await manifest("../package.json");

    expect(scripts).toMatchObject({
      build: "pnpm run --filter './packages/**' build",
      "build:bundle-size-reports":
        "pnpm run --filter class-variance-authority --filter cva --parallel build:size-limit",
      "prepare:packages": "pnpm build",
    });
    expect(scripts.build).not.toContain("size-limit");
    expect(scripts["prepare:packages"]).not.toContain("size-limit");
  });

  it("regenerates reports before every docs command that renders them", async () => {
    const { scripts } = await manifest("../docs/package.json");

    expect(scripts).toMatchObject({
      build:
        "pnpm -w run build:bundle-size-reports && wrangler types && astro check && astro build",
      dev: "pnpm -w run build:bundle-size-reports && wrangler types && astro dev",
      preview: "pnpm build && wrangler dev",
      start:
        "pnpm -w run build:bundle-size-reports && wrangler types && astro dev",
    });
    expect(scripts).not.toHaveProperty("prebuild");
    expect(scripts).not.toHaveProperty("predev");
  });
});

describe("clearBundleSizeReport", () => {
  it("removes a stale report and tolerates a missing one", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    await writeFile(reportPath, JSON.stringify(successfulReport()));

    await clearBundleSizeReport(directory);
    await expect(readFile(reportPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(clearBundleSizeReport(directory)).resolves.toBeUndefined();
  });
});

describe("writeReportAtomically", () => {
  it("writes a complete report without leaving a temporary file", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);

    await writeReportAtomically(reportPath, successfulReport());

    await expect(readFile(reportPath, "utf8")).resolves.toBe(
      `${JSON.stringify(successfulReport(), null, 2)}\n`,
    );
    await expect(readdir(directory)).resolves.toEqual([REPORT_FILENAME]);
  });

  it("removes a temporary file after a write failure", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    const failure = new Error("write failed");

    await expect(
      writeReportAtomically(reportPath, successfulReport(), {
        write: async (temporaryPath, contents) => {
          await writeFile(temporaryPath, contents);
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("removes a temporary file after a rename failure", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    const failure = new Error("rename failed");

    await expect(
      writeReportAtomically(reportPath, successfulReport(), {
        move: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("preserves the original failure when temporary-file cleanup fails", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    const failure = new Error("rename failed");

    await expect(
      writeReportAtomically(reportPath, successfulReport(), {
        move: async () => {
          throw failure;
        },
        remove: async (temporaryPath, options) => {
          await rm(temporaryPath, options);
          throw new Error("cleanup failed");
        },
      }),
    ).rejects.toBe(failure);
    await expect(readdir(directory)).resolves.toEqual([]);
  });
});

describe("writeBundleSizeReport", () => {
  it("writes a complete successful report and prints its Size Limit summary", async () => {
    const directory = await packageDirectory("bundle size report-");
    const command = vi.fn(async () => ({
      code: 0,
      stdout: JSON.stringify(successfulReport()),
      stderr: "build chatter",
    }));
    const outputWriter = vi.fn();
    const resolveCliPath = vi.fn(testCliPath);

    await expect(
      writeTestReport(directory, {
        command,
        outputWriter,
        resolveCliPath,
      }),
    ).resolves.toBe(0);
    expect(command).toHaveBeenCalledWith(
      process.execPath,
      [path.join(directory, "node_modules", "size-limit", "bin.js"), "--json"],
      { cwd: directory },
    );
    await expect(
      readFile(path.join(directory, REPORT_FILENAME), "utf8"),
    ).resolves.toBe(`${JSON.stringify(successfulReport(), null, 2)}\n`);
    expect(outputWriter).toHaveBeenCalledWith(
      "dist/index.cjs: 1,624 B / 1,650 B (26 B headroom)\n",
    );
  });

  it("treats entries without a configured budget as successful", async () => {
    const directory = await packageDirectory();
    const report = [{ name: "dist/index.cjs", size: 1624 }];
    const outputWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 0,
          stdout: JSON.stringify(report),
          stderr: "",
        }),
        outputWriter,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(path.join(directory, REPORT_FILENAME), "utf8"),
    ).resolves.toBe(`${JSON.stringify(report, null, 2)}\n`);
    expect(outputWriter).toHaveBeenCalledWith("dist/index.cjs: 1,624 B\n");
  });

  it("fails an empty Size Limit result array", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({ code: 0, stdout: "[]", stderr: "" }),
        errorWriter,
      }),
    ).resolves.toBe(1);
    await expect(
      readFile(path.join(directory, REPORT_FILENAME), "utf8"),
    ).resolves.toBe(
      '{\n  "error": "Size Limit did not produce a nonempty JSON report."\n}\n',
    );
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("Size Limit exited with code 0."),
    );
  });

  it("replaces a passing report with the fresh budget failure", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    await writeFile(reportPath, JSON.stringify(successfulReport()));
    const failedReport = [
      {
        name: "dist/index.cjs",
        passed: false,
        size: 1700,
        sizeLimit: 1650,
      },
    ];
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 7,
          stdout: JSON.stringify(failedReport),
          stderr: "",
        }),
        errorWriter,
      }),
    ).resolves.toBe(7);
    await expect(readFile(reportPath, "utf8")).resolves.toBe(
      `${JSON.stringify(failedReport, null, 2)}\n`,
    );
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("dist/index.cjs: 1700 bytes (limit 1650 bytes)."),
    );
  });

  it("reports the actual child code for a budget failure", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 0,
          stdout: JSON.stringify([
            {
              name: "dist/index.cjs",
              passed: false,
              size: 1700,
              sizeLimit: 1650,
            },
          ]),
          stderr: "",
        }),
        errorWriter,
      }),
    ).resolves.toBe(1);
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("Size Limit exited with code 0."),
    );
  });

  it("preserves a nonzero exit when Size Limit reports passing results", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 3,
          stdout: JSON.stringify(successfulReport()),
          stderr: "",
        }),
        errorWriter,
      }),
    ).resolves.toBe(3);
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("Size Limit exited with code 3."),
    );
  });

  it("replaces a stale report with an operational failure report", async () => {
    const directory = await packageDirectory();
    const reportPath = path.join(directory, REPORT_FILENAME);
    await writeFile(reportPath, JSON.stringify(successfulReport()));
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 2,
          stdout: "not json",
          stderr: "could not read dist",
        }),
        errorWriter,
      }),
    ).resolves.toBe(2);
    await expect(readFile(reportPath, "utf8")).resolves.toBe(
      `${JSON.stringify(
        {
          error:
            "Unexpected token 'o', \"not json\" is not valid JSON\ncould not read dist",
        },
        null,
        2,
      )}\n`,
    );
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("could not read dist"),
    );
  });

  it("reports a direct command error when no JSON or stderr is available", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: null,
          stdout: "",
          stderr: "",
          spawnError: new Error("spawn size-limit ENOENT"),
        }),
        errorWriter,
      }),
    ).resolves.toBe(1);
    await expect(
      readFile(path.join(directory, REPORT_FILENAME), "utf8"),
    ).resolves.toContain("spawn size-limit ENOENT");
  });

  it("keeps Size Limit operational JSON and makes an accidental zero exit fail", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      writeTestReport(directory, {
        command: async () => ({
          code: 0,
          stdout: '{"error":"dist is missing"}',
          stderr: "",
        }),
        errorWriter,
      }),
    ).resolves.toBe(1);
    await expect(
      readFile(path.join(directory, REPORT_FILENAME), "utf8"),
    ).resolves.toBe('{\n  "error": "dist is missing"\n}\n');
    expect(errorWriter).toHaveBeenCalledWith(
      expect.stringContaining("Size Limit exited with code 0."),
    );
  });
});

describe("main", () => {
  async function fromDirectory(directory, callback) {
    const currentDirectory = process.cwd();
    process.chdir(directory);
    try {
      return await callback();
    } finally {
      process.chdir(currentDirectory);
    }
  }

  it("returns the Size Limit exit code", async () => {
    const directory = await packageDirectory();

    await expect(
      fromDirectory(directory, () =>
        main(
          reportOptions({
            command: async () => ({
              code: 0,
              stdout: JSON.stringify(successfulReport()),
              stderr: "",
            }),
            outputWriter: vi.fn(),
          }),
        ),
      ),
    ).resolves.toBe(0);
  });

  it("reports an unexpected writer failure", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      fromDirectory(directory, () =>
        main(
          reportOptions({
            command: async () => {
              throw new Error("runner exploded");
            },
          }),
          errorWriter,
        ),
      ),
    ).resolves.toBe(1);
    expect(errorWriter).toHaveBeenCalledWith(
      "Could not write Size Limit report: runner exploded\n",
    );
  });

  it("formats a non-Error writer failure", async () => {
    const directory = await packageDirectory();
    const errorWriter = vi.fn();

    await expect(
      fromDirectory(directory, () =>
        main(
          reportOptions({
            command: async () => {
              throw "runner exploded";
            },
          }),
          errorWriter,
        ),
      ),
    ).resolves.toBe(1);
    expect(errorWriter).toHaveBeenCalledWith(
      "Could not write Size Limit report: runner exploded\n",
    );
  });
});
