import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  BUNDLE_SIZE_SOURCES,
  type BundleSizePackage,
  type BundleSizeSource,
} from "../lib/bundle-size-sources.ts";
import {
  generateBundleSizes,
  invalidateBundleSizeArtifact,
  main,
  measureBundleSizes,
  measurePackageBundleSize,
  parseSizeLimitOutput,
  runCommand,
  selectRootBundleSize,
  sizeLimitCliPath,
  writeBundleSizesAtomically,
  type BundleSizeData,
  type CommandResult,
} from "./generate-bundle-sizes.ts";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(prefix = "bundle-sizes-"): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

function sizeFor(source: BundleSizeSource): number {
  return source.package === "cva" ? 1624 : 580;
}

function reportFor(source: BundleSizeSource, size = sizeFor(source)): string {
  return JSON.stringify([
    {
      name: "dist/not-the-root-entry.mjs",
      passed: true,
      size: 10,
      sizeLimit: 20,
    },
    {
      name: source.entry,
      passed: true,
      size,
      sizeLimit: size + 100,
    },
  ]);
}

function commandForSources(
  sources: readonly BundleSizeSource[] = BUNDLE_SIZE_SOURCES,
) {
  return vi.fn(
    async (
      _command: string,
      _args: string[],
      { cwd }: { cwd: string },
    ): Promise<CommandResult> => {
      const source = sources.find(
        ({ packageDirectory }) => packageDirectory === cwd,
      );
      if (source === undefined) throw new Error(`Unexpected cwd: ${cwd}`);
      return { code: 0, stderr: "", stdout: reportFor(source) };
    },
  );
}

function rootResult(source: BundleSizeSource, overrides = {}) {
  return {
    name: source.entry,
    passed: true,
    size: sizeFor(source),
    sizeLimit: sizeFor(source) + 100,
    ...overrides,
  };
}

describe("bundle size sources", () => {
  it("maps package names to the exact root CommonJS entries", () => {
    expect(
      BUNDLE_SIZE_SOURCES.map(({ entry, package: packageName }) => ({
        entry,
        packageName,
      })),
    ).toEqual([
      {
        entry: "dist/index.js",
        packageName: "class-variance-authority",
      },
      { entry: "dist/index.cjs", packageName: "cva" },
    ]);
  });

  it("infers collection IDs from the source registry", () => {
    expectTypeOf<BundleSizePackage>().toEqualTypeOf<
      "class-variance-authority" | "cva"
    >();
  });
});

describe("Size Limit invocation", () => {
  it("resolves the package-local CLI", () => {
    const resolve = vi.fn(
      () => "/workspace/package/node_modules/size-limit/package.json",
    );

    expect(sizeLimitCliPath("/workspace/package", resolve)).toBe(
      "/workspace/package/node_modules/size-limit/bin.js",
    );
    expect(resolve).toHaveBeenCalledWith("size-limit/package.json", {
      paths: ["/workspace/package"],
    });
    expect(sizeLimitCliPath(BUNDLE_SIZE_SOURCES[1].packageDirectory)).toMatch(
      /size-limit[/\\]bin\.js$/,
    );
  });

  it("captures command output and direct spawn errors", async () => {
    const directory = await temporaryDirectory("bundle sizes command-");
    await expect(
      runCommand(
        process.execPath,
        [
          "--eval",
          'process.stdout.write(process.cwd()); process.stderr.write("details");',
        ],
        { cwd: directory },
      ),
    ).resolves.toMatchObject({
      code: 0,
      stderr: "details",
      stdout: directory,
    });

    await expect(
      runCommand("/missing/size-limit", [], { cwd: directory }),
    ).resolves.toMatchObject({ spawnError: expect.any(Error) });
  });

  it("uses each package's cwd and selects its exact root result", async () => {
    const source = BUNDLE_SIZE_SOURCES[1];
    const command = vi.fn(
      async (): Promise<CommandResult> => ({
        code: 0,
        stderr: "",
        stdout: reportFor(source),
      }),
    );
    const resolveCliPath = vi.fn(
      (packageDirectory: string) =>
        `${packageDirectory}/node_modules/size-limit/bin.js`,
    );

    await expect(
      measurePackageBundleSize(source, { command, resolveCliPath }),
    ).resolves.toEqual({
      passed: true,
      size: 1624,
      sizeLimit: 1724,
    });
    expect(resolveCliPath).toHaveBeenCalledWith(source.packageDirectory);
    expect(command).toHaveBeenCalledWith(
      process.execPath,
      [`${source.packageDirectory}/node_modules/size-limit/bin.js`, "--json"],
      { cwd: source.packageDirectory },
    );
  });
});

describe("Size Limit output", () => {
  it("selects the beta CJS entry rather than a similarly named ESM entry", () => {
    const source = BUNDLE_SIZE_SOURCES[1];
    const selected = selectRootBundleSize(source, [
      {
        name: "dist/index.mjs",
        passed: true,
        size: 999,
        sizeLimit: 1000,
      },
      rootResult(source),
    ]);

    expect(selected).toEqual({
      passed: true,
      size: 1624,
      sizeLimit: 1724,
    });
  });

  it.each([
    ["invalid JSON", "not json"],
    ["an empty report", "[]"],
    ["a non-array report", "{}"],
  ])("rejects %s", (_label, output) => {
    expect(() => parseSizeLimitOutput(output)).toThrow();
  });

  it.each([
    ["a missing root", []],
    [
      "a duplicate root",
      [rootResult(BUNDLE_SIZE_SOURCES[0]), rootResult(BUNDLE_SIZE_SOURCES[0])],
    ],
    ["a failed root", [rootResult(BUNDLE_SIZE_SOURCES[0], { passed: false })]],
    ["a string size", [rootResult(BUNDLE_SIZE_SOURCES[0], { size: "580" })]],
    [
      "a fractional limit",
      [rootResult(BUNDLE_SIZE_SOURCES[0], { sizeLimit: 680.5 })],
    ],
    ["a zero size", [rootResult(BUNDLE_SIZE_SOURCES[0], { size: 0 })]],
    [
      "an over-budget root",
      [rootResult(BUNDLE_SIZE_SOURCES[0], { size: 681, sizeLimit: 680 })],
    ],
  ])("rejects %s", (_label, report) => {
    expect(() =>
      selectRootBundleSize(BUNDLE_SIZE_SOURCES[0], report),
    ).toThrow();
  });

  it.each([
    ["without command details", { code: 1, stderr: "", stdout: "" }],
    [
      "with spawn and stderr details",
      {
        code: null,
        spawnError: new Error("spawn failed"),
        stderr: "dist is missing",
        stdout: "",
      },
    ],
  ])("propagates a failed Size Limit command %s", async (_label, result) => {
    await expect(
      measurePackageBundleSize(BUNDLE_SIZE_SOURCES[0], {
        command: async () => result,
      }),
    ).rejects.toThrow("Size Limit failed for class-variance-authority");
  });
});

describe("bundle size generation", () => {
  it("aggregates successful package-local measurements by package name", async () => {
    const command = commandForSources();

    await expect(
      measureBundleSizes(BUNDLE_SIZE_SOURCES, {
        command,
        resolveCliPath: (packageDirectory) =>
          `${packageDirectory}/node_modules/size-limit/bin.js`,
      }),
    ).resolves.toEqual({
      "class-variance-authority": {
        passed: true,
        size: 580,
        sizeLimit: 680,
      },
      cva: { passed: true, size: 1624, sizeLimit: 1724 },
    });
  });

  it("invalidates stale output before propagating a package failure", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(
      directory,
      "docs/.generated/bundle-sizes.json",
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, "stale");

    await expect(
      generateBundleSizes({
        artifactPath,
        command: async () => ({ code: 1, stderr: "failed", stdout: "" }),
      }),
    ).rejects.toThrow("Size Limit failed for");
    await expect(readFile(artifactPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("publishes a complete aggregate only after every package succeeds", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(
      directory,
      "docs/.generated/bundle-sizes.json",
    );
    const command = commandForSources();

    await expect(
      generateBundleSizes({
        artifactPath,
        command,
        resolveCliPath: (packageDirectory) =>
          `${packageDirectory}/node_modules/size-limit/bin.js`,
      }),
    ).resolves.toEqual({
      "class-variance-authority": {
        passed: true,
        size: 580,
        sizeLimit: 680,
      },
      cva: { passed: true, size: 1624, sizeLimit: 1724 },
    });
    await expect(readFile(artifactPath, "utf8")).resolves.toBe(
      '{\n  "class-variance-authority": {\n    "passed": true,\n    "size": 580,\n    "sizeLimit": 680\n  },\n  "cva": {\n    "passed": true,\n    "size": 1624,\n    "sizeLimit": 1724\n  }\n}\n',
    );
    expect(command).toHaveBeenCalledTimes(2);
  });

  it("replaces artifacts through a temporary file and atomic rename", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(directory, "bundle-sizes.json");
    const bundleSizes: Record<string, BundleSizeData> = {
      cva: { passed: true, size: 1624, sizeLimit: 1650 },
    };
    await writeFile(artifactPath, "old artifact");
    let oldArtifactRemainedVisible = false;

    await writeBundleSizesAtomically(artifactPath, bundleSizes, {
      createTemporaryName: () => "replacement",
      write: async (temporaryPath, contents) => {
        oldArtifactRemainedVisible =
          (await readFile(artifactPath, "utf8")) === "old artifact";
        await writeFile(temporaryPath, contents);
      },
    });

    expect(oldArtifactRemainedVisible).toBe(true);
    await expect(readFile(artifactPath, "utf8")).resolves.toContain('"cva"');
    await expect(readdir(directory)).resolves.toEqual(["bundle-sizes.json"]);
  });

  it("cleans up a temporary artifact after a writer failure", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(directory, "bundle-sizes.json");
    const failure = new Error("write failed");

    await expect(
      writeBundleSizesAtomically(
        artifactPath,
        { cva: { passed: true, size: 1624, sizeLimit: 1650 } },
        {
          createTemporaryName: () => "failed-write",
          write: async (temporaryPath, contents) => {
            await writeFile(temporaryPath, contents);
            throw failure;
          },
        },
      ),
    ).rejects.toBe(failure);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("preserves the write error when temporary-file cleanup also fails", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(directory, "bundle-sizes.json");
    const failure = new Error("rename failed");

    await expect(
      writeBundleSizesAtomically(
        artifactPath,
        { cva: { passed: true, size: 1624, sizeLimit: 1650 } },
        {
          createTemporaryName: () => "failed-rename",
          move: async () => {
            throw failure;
          },
          remove: async (temporaryPath, options) => {
            await rm(temporaryPath, options);
            throw new Error("cleanup failed");
          },
        },
      ),
    ).rejects.toBe(failure);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("tolerates a missing artifact when invalidating it", async () => {
    const directory = await temporaryDirectory();

    await expect(
      invalidateBundleSizeArtifact(path.join(directory, "missing.json")),
    ).resolves.toBeUndefined();
  });
});

describe("script entry point", () => {
  it("returns success and reports both Error and non-Error failures", async () => {
    const directory = await temporaryDirectory();
    const artifactPath = path.join(directory, "bundle-sizes.json");

    await expect(
      main({ artifactPath, command: commandForSources() }),
    ).resolves.toBe(0);

    for (const failure of [new Error("broken measurement"), "string failure"]) {
      const errorWriter = vi.fn();
      await expect(
        main(
          {
            artifactPath,
            command: async () => {
              throw failure;
            },
          },
          errorWriter,
        ),
      ).resolves.toBe(1);
      expect(errorWriter).toHaveBeenCalledWith(
        `Could not generate bundle sizes: ${
          failure instanceof Error ? failure.message : failure
        }\n`,
      );
    }
  });
});

describe("workspace scripts", () => {
  async function manifest(relativePath: string) {
    return JSON.parse(
      await readFile(new URL(relativePath, import.meta.url), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
  }

  it("keeps package builds source-only and Size Limit package-local", async () => {
    for (const relativePath of [
      "../../../packages/class-variance-authority/package.json",
      "../../../packages/cva/package.json",
    ]) {
      const { scripts } = await manifest(relativePath);

      expect(scripts).toMatchObject({
        build: "tsdown",
        bundlesize: "pnpm build && size-limit",
      });
      expect(scripts).not.toHaveProperty("build:size-limit");
      expect(scripts).not.toHaveProperty("prebuild");
    }
  });

  it("runs the docs generator through prebuild", async () => {
    const root = await manifest("../../../package.json");
    const docs = await manifest("../../package.json");
    const generator = "node ./src/scripts/generate-bundle-sizes.ts";

    expect(root.scripts).not.toHaveProperty("build:bundle-size-reports");
    expect(docs.scripts).toMatchObject({
      prebuild: generator,
      build: "wrangler types && astro check && astro build",
      dev: "pnpm prebuild && wrangler types && astro dev",
      preview: "pnpm build && wrangler dev",
      start: "pnpm prebuild && wrangler types && astro dev",
    });
    expect(docs.scripts).not.toHaveProperty("predev");
    expect(docs.scripts).not.toHaveProperty("prestart");
  });
});
