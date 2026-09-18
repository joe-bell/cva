import { execFileSync } from "node:child_process";
import type {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  checkVersions,
  check,
  compileFixture,
  countDiagnostics,
  diffFixtureSets,
  listFixtures,
  main,
  parseArgs,
  parseInstantiations,
  SCHEMA_VERSION,
  update,
  type Baseline,
  type FixtureCompileResult,
} from "./type-performance";

function extendedDiagnostics(instantiations: number) {
  return [
    "Files:                        158",
    "Instantiations:               " + instantiations,
    "Memory used:               72283K",
  ].join("\n");
}

function diagnosticOutput(count: number) {
  return Array.from(
    { length: count },
    (_, i) => `fixture.mts(${i + 1},1): error TS2322: not assignable.`,
  ).join("\n");
}

describe("parseArgs", () => {
  it("defaults to check when no flag is given", () => {
    expect(parseArgs([])).toEqual({ mode: "check" });
  });

  it("accepts --check explicitly", () => {
    expect(parseArgs(["--check"])).toEqual({ mode: "check" });
  });

  it("accepts --update", () => {
    expect(parseArgs(["--update"])).toEqual({ mode: "update" });
  });

  it("rejects an unknown argument", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(
      'Unknown argument "--bogus". Expected --check or --update.',
    );
  });
});

describe("parseInstantiations", () => {
  it("parses a plain instantiation count", () => {
    expect(parseInstantiations(extendedDiagnostics(662))).toBe(662);
  });

  it("parses a comma-formatted instantiation count", () => {
    expect(
      parseInstantiations(
        "Instantiations:               182,165\nMemory used: 1K",
      ),
    ).toBe(182165);
  });

  it("returns undefined when the line is missing", () => {
    expect(parseInstantiations("no diagnostics here")).toBeUndefined();
  });
});

describe("countDiagnostics", () => {
  it("counts zero diagnostics in clean output", () => {
    expect(countDiagnostics(extendedDiagnostics(610))).toBe(0);
  });

  it("counts every error diagnostic line", () => {
    expect(countDiagnostics(diagnosticOutput(2))).toBe(2);
  });
});

describe("listFixtures", () => {
  it("filters to .mts files and returns sorted fixture names", () => {
    const readdirImpl = vi.fn(() => [
      "b.mts",
      "a.mts",
      "README.md",
      "helper.ts",
    ]) as unknown as typeof readdirSync;

    expect(listFixtures("/fixtures", readdirImpl)).toEqual(["a", "b"]);
    expect(readdirImpl).toHaveBeenCalledWith("/fixtures");
  });
});

describe("diffFixtureSets", () => {
  it("reports no differences when both sets match", () => {
    expect(diffFixtureSets(["a", "b"], ["a", "b"])).toEqual({
      missingFromBaseline: [],
      missingFixtureFile: [],
    });
  });

  it("reports a fixture with no baseline entry", () => {
    expect(diffFixtureSets(["a", "b"], ["a"])).toEqual({
      missingFromBaseline: ["b"],
      missingFixtureFile: [],
    });
  });

  it("reports a baseline entry with no fixture file", () => {
    expect(diffFixtureSets(["a"], ["a", "b"])).toEqual({
      missingFromBaseline: [],
      missingFixtureFile: ["b"],
    });
  });

  it("reports both kinds of mismatch at once, sorted", () => {
    expect(diffFixtureSets(["z", "a"], ["a", "y"])).toEqual({
      missingFromBaseline: ["z"],
      missingFixtureFile: ["y"],
    });
  });
});

describe("checkVersions", () => {
  const baseline = {
    schemaVersion: SCHEMA_VERSION,
    typescript: "6.0.3",
    tailwindMerge: "3.6.0",
  };
  const installed = { typescript: "6.0.3", tailwindMerge: "3.6.0" };

  it("returns no problems when everything matches", () => {
    expect(checkVersions(baseline, installed)).toEqual([]);
  });

  it("flags a schema version mismatch", () => {
    const problems = checkVersions(
      { ...baseline, schemaVersion: SCHEMA_VERSION + 1 },
      installed,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      `Baseline schema version mismatch: the file records schema ${SCHEMA_VERSION + 1}, this script expects ${SCHEMA_VERSION}`,
    );
  });

  it("flags a TypeScript version mismatch", () => {
    const problems = checkVersions(baseline, {
      typescript: "6.1.0",
      tailwindMerge: "3.6.0",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      "TypeScript version mismatch: baseline recorded 6.0.3, installed is 6.1.0",
    );
  });

  it("flags a tailwind-merge version mismatch", () => {
    const problems = checkVersions(baseline, {
      typescript: "6.0.3",
      tailwindMerge: "3.7.0",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      "tailwind-merge version mismatch: baseline recorded 3.6.0, installed is 3.7.0",
    );
  });

  it("flags every mismatch together", () => {
    const problems = checkVersions(
      { ...baseline, schemaVersion: SCHEMA_VERSION + 1 },
      { typescript: "6.1.0", tailwindMerge: "3.7.0" },
    );
    expect(problems).toHaveLength(3);
  });
});

describe("compileFixture", () => {
  const options = {
    fixturesDir: "/fixtures",
    tscBin: "/tsc",
    packageDir: "/pkg",
    typeRoots: "/types",
  };

  it("parses a clean compile's stdout", () => {
    const execImpl = vi.fn(() =>
      extendedDiagnostics(662),
    ) as unknown as typeof execFileSync;

    const result = compileFixture("plain", { ...options, execImpl });
    expect(result).toEqual({
      fixture: "plain",
      instantiations: 662,
      diagnostics: 0,
      processFailed: false,
      stdout: extendedDiagnostics(662),
    });
    // Exact argv, not a subset: losing e.g. --noEmit would write .mjs/.d.mts
    // files beside the fixtures with no test noticing.
    expect(execImpl).toHaveBeenCalledWith(
      "/tsc",
      [
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
        "--typeRoots",
        "/types",
        "--types",
        "node",
        "/fixtures/plain.mts",
      ],
      { cwd: "/pkg", encoding: "utf8" },
    );
  });

  it("recovers a broken fixture's stdout from a thrown error and marks it process-failed", () => {
    const execImpl = vi.fn(() => {
      throw { stdout: diagnosticOutput(1), status: 2 };
    }) as unknown as typeof execFileSync;

    const result = compileFixture("broken", { ...options, execImpl });
    expect(result.processFailed).toBe(true);
    expect(result.diagnostics).toBe(1);
    expect(result.instantiations).toBeUndefined();
  });

  it("treats a non-zero exit with an otherwise well-formed count as a process failure", () => {
    // The gate this pins: a launcher that fails (crash, kill signal, bad
    // exit) after tsc has already written a clean-looking report must not
    // be indistinguishable from success just because stdout happens to
    // parse. See check()/update()'s processFailed handling.
    const execImpl = vi.fn(() => {
      throw { stdout: extendedDiagnostics(635), stderr: "", status: 1 };
    }) as unknown as typeof execFileSync;

    const result = compileFixture("plain", { ...options, execImpl });
    expect(result.processFailed).toBe(true);
    expect(result.diagnostics).toBe(0);
    expect(result.instantiations).toBe(635);
  });

  it("keeps stderr in the recovered output alongside stdout", () => {
    const execImpl = vi.fn(() => {
      throw {
        stdout: extendedDiagnostics(635),
        stderr: "tsc: internal error: out of memory",
        status: 1,
      };
    }) as unknown as typeof execFileSync;

    const result = compileFixture("plain", { ...options, execImpl });
    expect(result.processFailed).toBe(true);
    expect(result.stdout).toContain("Instantiations:               635");
    expect(result.stdout).toContain("tsc: internal error: out of memory");
  });

  it("falls back to the error message when the thrown error has no stdout", () => {
    const execImpl = vi.fn(() => {
      throw new Error("spawn tsc ENOENT");
    }) as unknown as typeof execFileSync;

    const result = compileFixture("missing-binary", { ...options, execImpl });
    expect(result.processFailed).toBe(true);
    expect(result.stdout).toBe("spawn tsc ENOENT");
    expect(result.instantiations).toBeUndefined();
    expect(result.diagnostics).toBe(0);
  });

  it("falls back to an empty string when the thrown error has neither", () => {
    const execImpl = vi.fn(() => {
      throw {};
    }) as unknown as typeof execFileSync;

    const result = compileFixture("unknown-failure", { ...options, execImpl });
    expect(result.processFailed).toBe(true);
    expect(result.stdout).toBe("");
    expect(result.instantiations).toBeUndefined();
    expect(result.diagnostics).toBe(0);
  });
});

function fakeCompile(
  results: Record<string, Partial<FixtureCompileResult>>,
): (fixture: string) => FixtureCompileResult {
  return vi.fn((fixture: string) => ({
    fixture,
    instantiations: 100,
    diagnostics: 0,
    processFailed: false,
    stdout: "",
    ...results[fixture],
  }));
}

describe("check", () => {
  const baseline: Baseline = {
    schemaVersion: 1,
    typescript: "6.0.3",
    tailwindMerge: "3.6.0",
    fixtures: { a: 100, b: 200 },
  };

  it("passes when every fixture matches its baseline count", () => {
    const compile = fakeCompile({
      a: { instantiations: 100 },
      b: { instantiations: 200 },
    });
    expect(check(["a", "b"], baseline, compile)).toEqual([]);
  });

  it("reports a regression (count increased)", () => {
    const compile = fakeCompile({
      a: { instantiations: 150 },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b"], baseline, compile);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("expected 100, measured 150 (+50)");
  });

  it("reports an improvement (count decreased) without a stranded ceiling", () => {
    const compile = fakeCompile({
      a: { instantiations: 90 },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b"], baseline, compile);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("expected 100, measured 90 (-10)");
  });

  it("fails a fixture with any tsc diagnostic, even if instantiations happen to match", () => {
    const compile = fakeCompile({
      a: { instantiations: 100, diagnostics: 1, stdout: diagnosticOutput(1) },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b"], baseline, compile);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Fixture "a" produced 1 tsc diagnostic(s)');
  });

  it("fails a fixture whose tsc process failed, even though its output parses cleanly", () => {
    const compile = fakeCompile({
      a: { instantiations: 100, diagnostics: 0, processFailed: true },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b"], baseline, compile);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("tsc process exited non-zero");
  });

  it("fails a fixture whose instantiation count could not be parsed", () => {
    const compile = fakeCompile({
      a: { instantiations: undefined, stdout: "unexpected output" },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b"], baseline, compile);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("did not report an instantiation count");
  });

  it("fails a fixture file with no baseline entry, without compiling it", () => {
    const compile = fakeCompile({
      a: { instantiations: 100 },
      b: { instantiations: 200 },
    });
    const problems = check(["a", "b", "c"], baseline, compile);
    expect(problems).toEqual([
      'Fixture "c" has no entry in the baseline. Run `pnpm bench:types` to add it.',
    ]);
    expect(compile).not.toHaveBeenCalledWith("c");
  });

  it("fails a baseline entry with no matching fixture file", () => {
    const compile = fakeCompile({ a: { instantiations: 100 } });
    const problems = check(["a"], baseline, compile);
    expect(problems).toEqual([
      'Baseline entry "b" has no matching fixture file. Run `pnpm bench:types` to remove it.',
    ]);
  });
});

describe("update", () => {
  const installed = { typescript: "6.0.3", tailwindMerge: "3.6.0" };

  it("builds a fresh baseline from clean fixture compiles", () => {
    const compile = fakeCompile({
      a: { instantiations: 100 },
      b: { instantiations: 200 },
    });
    const { baseline, problems } = update(["a", "b"], compile, installed);
    expect(problems).toEqual([]);
    expect(baseline).toEqual({
      schemaVersion: 1,
      typescript: "6.0.3",
      tailwindMerge: "3.6.0",
      fixtures: { a: 100, b: 200 },
    });
  });

  it("refuses to bake in a fixture with a tsc diagnostic", () => {
    const compile = fakeCompile({
      a: { diagnostics: 1, stdout: diagnosticOutput(1) },
    });
    const { baseline, problems } = update(["a"], compile, installed);
    expect(baseline.fixtures).toEqual({});
    expect(problems[0]).toContain("refusing to bake a broken count");
  });

  it("refuses to bake in a fixture whose tsc process failed", () => {
    const compile = fakeCompile({
      a: { instantiations: 100, diagnostics: 0, processFailed: true },
    });
    const { baseline, problems } = update(["a"], compile, installed);
    expect(baseline.fixtures).toEqual({});
    expect(problems[0]).toContain("tsc process exited non-zero");
  });

  it("refuses to bake in a fixture with no parseable instantiation count", () => {
    const compile = fakeCompile({
      a: { instantiations: undefined, stdout: "unexpected output" },
    });
    const { baseline, problems } = update(["a"], compile, installed);
    expect(baseline.fixtures).toEqual({});
    expect(problems[0]).toContain("did not report an instantiation count");
  });
});

/* CLI
  ============================================ */

const BASELINE: Baseline = {
  schemaVersion: 1,
  typescript: "6.0.3",
  tailwindMerge: "3.6.0",
  fixtures: { plain: 662 },
};

function fakeFileSystem({
  distMissing = false,
  typescriptVersion = "6.0.3",
  tailwindMergeVersion = "3.6.0",
  baseline = BASELINE,
  fixtureFiles = ["plain.mts"],
}: {
  distMissing?: boolean;
  typescriptVersion?: string;
  tailwindMergeVersion?: string;
  baseline?: Baseline;
  fixtureFiles?: string[];
} = {}) {
  const existsImpl = vi.fn(
    (target: string) => !(distMissing && target.endsWith("dist/index.mjs")),
  ) as unknown as typeof existsSync;

  const readFileImpl = vi.fn((target: string) => {
    if (target.endsWith("typescript/package.json")) {
      return JSON.stringify({ version: typescriptVersion });
    }
    if (target.endsWith("tailwind-merge/package.json")) {
      return JSON.stringify({ version: tailwindMergeVersion });
    }
    if (target.endsWith("type-performance.json")) {
      return JSON.stringify(baseline);
    }
    throw new Error(`unexpected readFileImpl call: ${target}`);
  }) as unknown as typeof readFileSync;

  const writeFileImpl = vi.fn() as unknown as typeof writeFileSync;

  const readdirImpl = vi.fn(
    () => fixtureFiles,
  ) as unknown as typeof readdirSync;

  return { existsImpl, readFileImpl, writeFileImpl, readdirImpl };
}

describe("main", () => {
  it("fails fast when parseArgs rejects the argv", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitCode = main({ argv: ["--bogus"] });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown argument"),
    );
    errorSpy.mockRestore();
  });

  it("fails when packages/cva/dist is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem({ distMissing: true });
    const exitCode = main({ argv: ["--check"], ...fs });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("run `pnpm --filter cva build` first"),
    );
    errorSpy.mockRestore();
  });

  it("fails on an empty fixture set instead of vacuously passing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem({ fixtureFiles: [] });
    const execImpl = vi.fn() as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--check"], ...fs, execImpl });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("no .mts fixtures found"),
    );
    expect(execImpl).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("fails when a required file can't be read", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem();
    fs.readFileImpl = vi.fn(() => {
      throw new Error("ENOENT: no such file");
    }) as unknown as typeof fs.readFileImpl;
    const exitCode = main({ argv: ["--check"], ...fs });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("ENOENT: no such file"),
    );
    errorSpy.mockRestore();
  });

  it("fails --check on a version mismatch before compiling anything", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem({ typescriptVersion: "6.1.0" });
    const execImpl = vi.fn() as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--check"], ...fs, execImpl });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("TypeScript version mismatch"),
    );
    expect(execImpl).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("fails --check when a fixture regresses", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem();
    const execImpl = vi.fn(() =>
      extendedDiagnostics(700),
    ) as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--check"], ...fs, execImpl });
    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("fixture(s) failed"),
    );
    errorSpy.mockRestore();
  });

  it("passes --check when every fixture matches", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fs = fakeFileSystem();
    const execImpl = vi.fn(() =>
      extendedDiagnostics(662),
    ) as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--check"], ...fs, execImpl });
    expect(exitCode).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("all 1 fixtures match"),
    );
    logSpy.mockRestore();
  });

  it("defaults to --check when no argv is given", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fs = fakeFileSystem();
    const execImpl = vi.fn(() =>
      extendedDiagnostics(662),
    ) as unknown as typeof execFileSync;
    const exitCode = main({ argv: [], ...fs, execImpl });
    expect(exitCode).toBe(0);
    logSpy.mockRestore();
  });

  it("--update refuses to write a baseline built from a broken fixture", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fs = fakeFileSystem();
    const execImpl = vi.fn(() =>
      diagnosticOutput(1),
    ) as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--update"], ...fs, execImpl });
    expect(exitCode).toBe(1);
    expect(fs.writeFileImpl).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("--update writes a fresh baseline on a clean run", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fs = fakeFileSystem();
    const execImpl = vi.fn(() =>
      extendedDiagnostics(700),
    ) as unknown as typeof execFileSync;
    const exitCode = main({ argv: ["--update"], ...fs, execImpl });
    expect(exitCode).toBe(0);
    expect(fs.writeFileImpl).toHaveBeenCalledWith(
      expect.stringContaining("type-performance.json"),
      expect.stringContaining('"plain": 700'),
    );
    logSpy.mockRestore();
  });
});
