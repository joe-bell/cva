import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { BENCH_OPTIONS, loadImplementations } from "./harness";

interface BenchModule {
  cva?: unknown;
}

// Each fake package gets its own mkdtemp dir: ESM caches modules by URL, so
// re-generating a dist file in place and re-importing would return the stale
// module.
function writePackage(version: string, source = 'export const cva = "local";') {
  const dir = mkdtempSync(path.join(tmpdir(), "harness-test-pkg-"));
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ version }));
  mkdirSync(path.join(dir, "dist"), { recursive: true });
  writeFileSync(path.join(dir, "dist/index.mjs"), source);
  return dir;
}

// Baselines resolve via <baselinesDir>/<entry.dir>/node_modules/<pkg>/dist.
function writeBaseline(
  baselinesDir: string,
  entryDir: string,
  pkg: string,
  source: string,
) {
  const pkgDir = path.join(baselinesDir, entryDir, "node_modules", pkg);
  mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
  writeFileSync(path.join(pkgDir, "dist/index.mjs"), source);
}

function writeManifest(baselinesDir: string, entries: unknown[]) {
  writeFileSync(
    path.join(baselinesDir, "manifest.json"),
    JSON.stringify({ schemaVersion: 1, entries }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("BENCH_OPTIONS", () => {
  it("doubles tinybench's default measure and warmup times", () => {
    expect(BENCH_OPTIONS).toEqual({ time: 1000, warmupTime: 200 });
  });
});

describe("loadImplementations", () => {
  it("loads only the local build when BENCH_BASELINES_DIR is unset", async () => {
    vi.stubEnv("BENCH_BASELINES_DIR", undefined);
    const packageDir = writePackage("1.2.3");

    const implementations = await loadImplementations<BenchModule>(
      "cva",
      packageDir,
    );

    expect(implementations).toHaveLength(1);
    expect(implementations[0]).toMatchObject({
      label: "local",
      version: "1.2.3",
    });
    expect(implementations[0].mod.cva).toBe("local");
  });

  it("throws a run-pnpm-build error when the local dist is missing", async () => {
    vi.stubEnv("BENCH_BASELINES_DIR", undefined);
    const packageDir = mkdtempSync(path.join(tmpdir(), "harness-test-nodist-"));
    writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({ version: "1.2.3" }),
    );

    await expect(
      loadImplementations<BenchModule>("cva", packageDir),
    ).rejects.toThrow(/run `pnpm build` first/);
  });

  it("returns local only when the baselines manifest is missing or unparseable", async () => {
    const packageDir = writePackage("1.2.3");

    const emptyDir = mkdtempSync(path.join(tmpdir(), "harness-test-empty-"));
    vi.stubEnv("BENCH_BASELINES_DIR", emptyDir);
    await expect(
      loadImplementations<BenchModule>("cva", packageDir),
    ).resolves.toHaveLength(1);

    const badDir = mkdtempSync(path.join(tmpdir(), "harness-test-bad-"));
    writeFileSync(path.join(badDir, "manifest.json"), "not json");
    vi.stubEnv("BENCH_BASELINES_DIR", badDir);
    await expect(
      loadImplementations<BenchModule>("cva", packageDir),
    ).resolves.toHaveLength(1);
  });

  it("loads usable baselines and skips other-package, skipped and dirless entries", async () => {
    const packageDir = writePackage("1.2.3");
    const baselinesDir = mkdtempSync(path.join(tmpdir(), "harness-test-base-"));
    writeBaseline(
      baselinesDir,
      "cva-prerelease",
      "cva",
      'export const cva = "baseline";',
    );
    writeManifest(baselinesDir, [
      {
        package: "cva",
        label: "prerelease",
        version: "1.0.0-beta.4",
        dir: "cva-prerelease",
      },
      {
        package: "class-variance-authority",
        label: "release",
        version: "0.7.1",
        dir: "cva-release",
      },
      {
        package: "cva",
        label: "release",
        version: "unknown",
        skipped: "no beta dist-tag on npm",
      },
      { package: "cva", label: "release", version: "0.0.0" },
    ]);
    vi.stubEnv("BENCH_BASELINES_DIR", baselinesDir);

    const implementations = await loadImplementations<BenchModule>(
      "cva",
      packageDir,
    );

    expect(implementations).toHaveLength(2);
    expect(implementations[1]).toMatchObject({
      label: "prerelease",
      version: "1.0.0-beta.4",
    });
    expect(implementations[1].mod.cva).toBe("baseline");
  });

  it("skips a baseline whose dist fails to import", async () => {
    const packageDir = writePackage("1.2.3");
    const baselinesDir = mkdtempSync(path.join(tmpdir(), "harness-test-fail-"));
    writeManifest(baselinesDir, [
      {
        package: "cva",
        label: "prerelease",
        version: "1.0.0-beta.4",
        dir: "cva-prerelease",
      },
    ]);
    vi.stubEnv("BENCH_BASELINES_DIR", baselinesDir);

    await expect(
      loadImplementations<BenchModule>("cva", packageDir),
    ).resolves.toHaveLength(1);
  });

  it("skips a baseline that fails the caller's isUsable probe", async () => {
    const packageDir = writePackage("1.2.3");
    const baselinesDir = mkdtempSync(
      path.join(tmpdir(), "harness-test-probe-"),
    );
    writeBaseline(
      baselinesDir,
      "cva-prerelease",
      "cva",
      "export const somethingElse = true;",
    );
    writeManifest(baselinesDir, [
      {
        package: "cva",
        label: "prerelease",
        version: "1.0.0-beta.4",
        dir: "cva-prerelease",
      },
    ]);
    vi.stubEnv("BENCH_BASELINES_DIR", baselinesDir);

    const implementations = await loadImplementations<BenchModule>(
      "cva",
      packageDir,
      (mod) => typeof mod.cva === "string",
    );

    expect(implementations).toHaveLength(1);
    expect(implementations[0].label).toBe("local");
  });
});
