import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  findGroup,
  gitSha,
  localVersion,
  main,
  packageNameFromFilepath,
  parseArgs,
  toTasks,
} from "./report";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const BENCHMARK = {
  name: "Create component (one-time setup)",
  hz: 100,
  mean: 0.01,
  rme: 0.5,
  sampleCount: 1000,
};

function group(fullName: string, benchmarks = [BENCHMARK]) {
  return { fullName, benchmarks };
}

function reportFixture(files: Record<string, unknown>[]) {
  return { files };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parseArgs", () => {
  it("defaults to the repo output paths and the BENCH_BASELINES_DIR env", () => {
    vi.stubEnv("BENCH_BASELINES_DIR", "/baselines/from-env");

    expect(parseArgs([])).toEqual({
      vitestJson: path.join(repoRoot, "test/bench/.output/vitest-bench.json"),
      baselinesDir: "/baselines/from-env",
      outDir: path.join(repoRoot, "test/bench/.output"),
    });
  });

  it("reads --vitest-json, --baselines and --out overrides", () => {
    expect(
      parseArgs([
        "--vitest-json",
        "/tmp/report.json",
        "--baselines",
        "/tmp/baselines",
        "--out",
        "/tmp/out",
      ]),
    ).toEqual({
      vitestJson: "/tmp/report.json",
      baselinesDir: "/tmp/baselines",
      outDir: "/tmp/out",
    });
  });
});

describe("packageNameFromFilepath", () => {
  it("maps a bench file basename to its workspace package", () => {
    expect(
      packageNameFromFilepath("/repo/test/bench/scripts/cva.bench.ts"),
    ).toBe("cva");
    expect(
      packageNameFromFilepath("/repo/class-variance-authority.bench.ts"),
    ).toBe("class-variance-authority");
  });

  it("returns undefined for files that aren't package bench files", () => {
    expect(packageNameFromFilepath("/repo/other.bench.ts")).toBeUndefined();
  });
});

describe("localVersion", () => {
  it("reads the version from the package's package.json", () => {
    const expected = JSON.parse(
      readFileSync(path.join(repoRoot, "packages/cva/package.json"), "utf8"),
    ).version;

    expect(localVersion("cva")).toBe(expected);
  });
});

describe("gitSha", () => {
  it("returns the trimmed rev-parse output", () => {
    const execImpl = vi.fn(() => "abc1234\n") as never;

    expect(gitSha(execImpl)).toBe("abc1234");
    expect(execImpl).toHaveBeenCalledWith("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    });
  });

  it("returns 'unknown' when git isn't available", () => {
    const execImpl = vi.fn(() => {
      throw new Error("git not found");
    }) as never;

    expect(gitSha(execImpl)).toBe("unknown");
  });
});

describe("findGroup", () => {
  it("finds a group by describe name within the package's bench file", () => {
    const files = [
      {
        filepath: "/repo/cva.bench.ts",
        groups: [group("cva.bench.ts > local")],
      },
    ];

    expect(findGroup(files, "cva", "local")).toBe(files[0].groups[0]);
  });

  it("skips groups that belong to another package's bench file", () => {
    const files = [
      {
        filepath: "/repo/class-variance-authority.bench.ts",
        groups: [group("class-variance-authority.bench.ts > local")],
      },
    ];

    expect(findGroup(files, "cva", "local")).toBeUndefined();
  });

  it("returns undefined when no group matches the describe name", () => {
    const files = [
      {
        filepath: "/repo/cva.bench.ts",
        groups: [group("cva.bench.ts > prerelease@1.0.0-beta.4")],
      },
    ];

    expect(findGroup(files, "cva", "local")).toBeUndefined();
  });
});

describe("toTasks", () => {
  it("maps vitest benchmarks to the artifact task shape", () => {
    expect(toTasks(group("x > local"))).toEqual([
      {
        name: BENCHMARK.name,
        hz: BENCHMARK.hz,
        mean: BENCHMARK.mean,
        rme: BENCHMARK.rme,
        samples: BENCHMARK.sampleCount,
      },
    ]);
  });
});

describe("main", () => {
  function writeFixtures({
    files,
    manifestEntries,
  }: {
    files: Record<string, unknown>[];
    manifestEntries?: Record<string, unknown>[];
  }) {
    const dir = mkdtempSync(path.join(tmpdir(), "report-test-"));
    const vitestJson = path.join(dir, "vitest-bench.json");
    writeFileSync(vitestJson, JSON.stringify(reportFixture(files)));

    const outDir = path.join(dir, "out");
    const argv = ["--vitest-json", vitestJson, "--out", outDir];

    if (manifestEntries) {
      writeFileSync(
        path.join(dir, "manifest.json"),
        JSON.stringify({ schemaVersion: 1, entries: manifestEntries }),
      );
      argv.push("--baselines", dir);
    }

    return { dir, outDir, argv };
  }

  function readArtifact(outDir: string, pkg: string) {
    return JSON.parse(
      readFileSync(path.join(outDir, `benchmark-${pkg}.json`), "utf8"),
    );
  }

  const localGroups = [
    { filepath: "/repo/cva.bench.ts", groups: [group("cva.bench.ts > local")] },
    {
      filepath: "/repo/class-variance-authority.bench.ts",
      groups: [group("class-variance-authority.bench.ts > local")],
    },
  ];

  it("writes one artifact per package with local results and metadata", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({ files: localGroups });

    main(argv);

    for (const pkg of ["cva", "class-variance-authority"]) {
      const artifact = readArtifact(outDir, pkg);
      expect(artifact).toMatchObject({
        schemaVersion: 1,
        package: pkg,
        node: process.version,
        implementations: [
          {
            label: "local",
            version: localVersion(pkg),
            tasks: toTasks(group("x > local")),
          },
        ],
      });
      expect(artifact.commit).toMatch(/^(unknown|[0-9a-f]{7,40})$/);
      expect(() => new Date(artifact.timestamp).toISOString()).not.toThrow();
    }
    expect(log).toHaveBeenCalledWith(
      `Wrote ${path.join(outDir, "benchmark-cva.json")}`,
    );
  });

  it("marks a missing local group as skipped", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({ files: [] });

    main(argv);

    expect(readArtifact(outDir, "cva").implementations).toEqual([
      {
        label: "local",
        version: localVersion("cva"),
        skipped: "no local benchmark results found",
      },
    ]);
  });

  it("includes baseline tasks when the manifest entry has a matching group", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({
      files: [
        {
          filepath: "/repo/cva.bench.ts",
          groups: [
            group("cva.bench.ts > local"),
            group("cva.bench.ts > prerelease@1.0.0-beta.4"),
          ],
        },
      ],
      manifestEntries: [
        {
          package: "cva",
          label: "prerelease",
          version: "1.0.0-beta.4",
          dir: "cva-prerelease",
        },
      ],
    });

    main(argv);

    expect(readArtifact(outDir, "cva").implementations[1]).toEqual({
      label: "prerelease",
      version: "1.0.0-beta.4",
      tasks: toTasks(group("x > local")),
    });
  });

  it("marks a manifest entry without benchmark results as failed to run", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({
      files: localGroups,
      manifestEntries: [
        { package: "cva", label: "prerelease", version: "1.0.0-beta.4" },
      ],
    });

    main(argv);

    expect(readArtifact(outDir, "cva").implementations[1]).toEqual({
      label: "prerelease",
      version: "1.0.0-beta.4",
      skipped: "benchmark scenarios failed to run against this version",
    });
  });

  it("sanitizes tool-generated skip reasons from the manifest", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({
      files: localGroups,
      manifestEntries: [
        {
          package: "cva",
          label: "prerelease",
          version: "1.0.0-beta.4",
          skipped:
            "failed to install: pnpm add cva@1.0.0-beta.4 from https://registry.npmjs.org/cva failed",
        },
      ],
    });

    main(argv);

    const skipped = readArtifact(outDir, "cva").implementations[1].skipped;
    expect(skipped).not.toMatch(/@|https?:\/\//);
    expect(skipped).toMatch(/^failed to install: pnpm add cva at /);
  });

  it("ignores baselines when no manifest.json exists in the directory", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { outDir, argv } = writeFixtures({ files: localGroups });
    const emptyDir = mkdtempSync(path.join(tmpdir(), "report-test-empty-"));

    main([...argv, "--baselines", emptyDir]);

    expect(readArtifact(outDir, "cva").implementations).toHaveLength(1);
  });
});
