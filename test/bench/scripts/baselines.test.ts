import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  installBaseline,
  main,
  parseArgs,
  resolvePackageVersions,
  rootPackageManager,
} from "./baselines";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe("resolvePackageVersions", () => {
  it("resolves cva prerelease from the beta dist-tag only", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.0.0", beta: "1.0.0-beta.6" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      { label: "prerelease", version: "1.0.0-beta.6" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://registry.npmjs.org/cva",
      expect.objectContaining({
        headers: { Accept: "application/vnd.npm.install-v1+json" },
      }),
    );
  });

  it("resolves class-variance-authority release from the latest dist-tag only", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.7.1", canary: "0.7.1-canary.2" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("class-variance-authority", fetchImpl),
    ).resolves.toEqual([{ label: "release", version: "0.7.1" }]);
  });

  it("marks a missing dist-tag as skipped for the labels that package uses", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ "dist-tags": { latest: "0.7.1" } })),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "no beta dist-tag on npm",
      },
    ]);
  });

  it("skips placeholder versions even when the dist-tag exists", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ "dist-tags": { latest: "0.0.0" } })),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("class-variance-authority", fetchImpl),
    ).resolves.toEqual([
      {
        label: "release",
        version: "0.0.0",
        skipped: "latest dist-tag points at placeholder version 0.0.0",
      },
    ]);
  });

  it("returns skipped entries when the npm registry is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    }) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "failed to resolve npm dist-tags: network unavailable",
      },
    ]);
  });

  it("marks a non-ok registry response as skipped with the status", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("not found", { status: 404, statusText: "Not Found" }),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "npm registry returned 404 Not Found",
      },
    ]);
  });

  it("resolves both labels for a package without a baseline mapping", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "1.2.3", beta: "2.0.0-beta.1" },
          }),
        ),
    ) as unknown as typeof fetch;

    await expect(
      resolvePackageVersions("some-other-package", fetchImpl),
    ).resolves.toEqual([
      { label: "release", version: "1.2.3" },
      { label: "prerelease", version: "2.0.0-beta.1" },
    ]);
  });

  it("marks a response without a dist-tags object as skipped", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({})),
    ) as unknown as typeof fetch;

    await expect(resolvePackageVersions("cva", fetchImpl)).resolves.toEqual([
      {
        label: "prerelease",
        version: "unknown",
        skipped: "no beta dist-tag on npm",
      },
    ]);
  });

  it("marks an unparseable registry body as skipped", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("this is not json"),
    ) as unknown as typeof fetch;

    const [resolved] = await resolvePackageVersions("cva", fetchImpl);
    expect(resolved.label).toBe("prerelease");
    expect(resolved.version).toBe("unknown");
    expect(resolved.skipped).toMatch(/failed to parse npm dist-tags:/);
  });
});

describe("parseArgs", () => {
  it("defaults to a directory under the OS tmpdir", () => {
    expect(parseArgs([]).out).toBe(path.join(tmpdir(), "cva-bench-baselines"));
  });

  it("reads an --out override", () => {
    expect(parseArgs(["--out", "/tmp/baselines"]).out).toBe("/tmp/baselines");
  });

  it("ignores an --out flag with no value", () => {
    expect(parseArgs(["--out"]).out).toBe(parseArgs([]).out);
  });
});

describe("rootPackageManager", () => {
  it("returns the root package.json packageManager pin from the bench cwd", () => {
    const benchDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const rootPackage = JSON.parse(
      readFileSync(path.resolve(benchDir, "../..", "package.json"), "utf8"),
    );
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        'import { rootPackageManager } from "./scripts/baselines.ts"; process.stdout.write(rootPackageManager());',
      ],
      { cwd: benchDir, encoding: "utf8" },
    );

    expect(output).toBe(rootPackage.packageManager);
  });
});

describe("installBaseline", () => {
  it("scaffolds the install dir and runs a scripts-disabled pnpm add", () => {
    const dir = path.join(
      mkdtempSync(path.join(tmpdir(), "baselines-test-")),
      "cva-prerelease",
    );
    tempDirs.push(path.dirname(dir));
    const execImpl = vi.fn() as unknown as typeof execFileSync;

    installBaseline("cva", "1.0.0-beta.4", dir, execImpl);

    const pkgJson = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    expect(pkgJson).toMatchObject({
      name: "bench-baseline-cva",
      private: true,
      packageManager: rootPackageManager(),
    });
    expect(execImpl).toHaveBeenCalledWith(
      "pnpm",
      ["add", "cva@1.0.0-beta.4", "--ignore-workspace", "--ignore-scripts"],
      { cwd: dir, stdio: "inherit" },
    );
  });
});

describe("main", () => {
  function distTagsFetch() {
    return vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            "dist-tags": { latest: "0.7.1", beta: "1.0.0-beta.4" },
          }),
        ),
    ) as unknown as typeof fetch;
  }

  function readManifest(out: string) {
    return JSON.parse(readFileSync(path.join(out, "manifest.json"), "utf8"));
  }

  it("installs resolved versions and writes their manifest entries", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const out = mkdtempSync(path.join(tmpdir(), "baselines-main-"));
    tempDirs.push(out);
    const execImpl = vi.fn() as unknown as typeof execFileSync;

    await main(["--out", out], { fetchImpl: distTagsFetch(), execImpl });

    expect(readManifest(out)).toEqual({
      schemaVersion: 1,
      entries: [
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
          dir: "class-variance-authority-release",
        },
      ],
    });
    expect(execImpl).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Wrote baseline manifest"),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("cva prerelease@1.0.0-beta.4: installed"),
    );
  });

  it("passes skipped resolutions through without installing", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const out = mkdtempSync(path.join(tmpdir(), "baselines-main-skip-"));
    tempDirs.push(out);
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const execImpl = vi.fn() as unknown as typeof execFileSync;

    await main(["--out", out], { fetchImpl, execImpl });

    expect(execImpl).not.toHaveBeenCalled();
    for (const entry of readManifest(out).entries) {
      expect(entry.skipped).toMatch(/failed to resolve npm dist-tags/);
      expect(entry.dir).toBeUndefined();
    }
  });

  it("marks an entry as skipped when the install fails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const out = mkdtempSync(path.join(tmpdir(), "baselines-main-fail-"));
    tempDirs.push(out);
    const execImpl = vi.fn(() => {
      throw new Error("registry timeout");
    }) as unknown as typeof execFileSync;

    await main(["--out", out], { fetchImpl: distTagsFetch(), execImpl });

    for (const entry of readManifest(out).entries) {
      expect(entry.skipped).toBe("failed to install: registry timeout");
      expect(entry.dir).toBeUndefined();
    }
  });
});
