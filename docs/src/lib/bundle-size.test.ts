import type { LoaderContext } from "astro/loaders";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  BUNDLE_SIZE_SOURCES,
  bundleSizeLoader,
  bundleSizeSchema,
  formatDecimalBytes,
  readBundleSizeEntries,
  readBundleSizeText,
  requiredBundleSizeEntry,
  type BundleSizePackage,
  type ReadText,
} from "./bundle-size";

class Watcher {
  readonly paths: string[] = [];
  readonly listeners = new Map<string, (path: string) => void>();

  add(paths: string[]) {
    this.paths.push(...paths);
    return this;
  }

  on(event: string, listener: (path: string) => void) {
    this.listeners.set(event, listener);
    return this;
  }

  emit(event: string, changedPath: string) {
    this.listeners.get(event)?.(changedPath);
  }
}

function report(source: (typeof BUNDLE_SIZE_SOURCES)[number], size: number) {
  return JSON.stringify([
    {
      name: source.buildEntry,
      passed: true,
      size,
      sizeLimit: size + 100,
    },
    {
      name: "dist/other.cjs",
      passed: true,
      size: 10,
      sizeLimit: 20,
    },
  ]);
}

function readTextFor(
  reports = new Map(
    BUNDLE_SIZE_SOURCES.map((source, index) => [
      source.reportPath,
      report(source, 1000 + index),
    ]),
  ),
): ReadText {
  return async (filePath) => {
    if (
      !BUNDLE_SIZE_SOURCES.some(({ reportPath }) => reportPath === filePath)
    ) {
      throw new Error(`Unexpected read: ${filePath}`);
    }
    const value = reports.get(filePath);
    if (value === undefined) throw new Error(`ENOENT: ${filePath}`);
    return value;
  };
}

function context(
  watcher: Watcher | undefined,
  parseData = vi.fn(async ({ data }: { data: unknown }) =>
    bundleSizeSchema.parse(data),
  ),
) {
  const store = {
    clear: vi.fn(),
    set: vi.fn(),
  };
  const logger = { error: vi.fn() };
  return {
    context: {
      store,
      parseData,
      logger,
      watcher,
    } as unknown as LoaderContext,
    store,
    logger,
    parseData,
  };
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("bundle size sources", () => {
  it("maps each package name to its root CommonJS entry", () => {
    expect(
      BUNDLE_SIZE_SOURCES.map(({ package: packageName, buildEntry }) => ({
        package: packageName,
        buildEntry,
      })),
    ).toEqual([
      {
        package: "class-variance-authority",
        buildEntry: "dist/index.js",
      },
      {
        package: "cva",
        buildEntry: "dist/index.cjs",
      },
    ]);
    expect(
      BUNDLE_SIZE_SOURCES.every(({ reportPath }) => reportPath.startsWith("/")),
    ).toBe(true);
  });

  it("infers the package union from the source registry alone", () => {
    expectTypeOf<BundleSizePackage>().toEqualTypeOf<
      "class-variance-authority" | "cva"
    >();
  });

  it("keys fixture entries by package name", async () => {
    await expect(readBundleSizeEntries(readTextFor())).resolves.toEqual([
      {
        id: "class-variance-authority",
        data: { passed: true, size: 1000, sizeLimit: 1100 },
      },
      {
        id: "cva",
        data: { passed: true, size: 1001, sizeLimit: 1101 },
      },
    ]);
  });
});

describe("readBundleSizeText", () => {
  it("reads a supplied fixture without relying on generated package reports", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bundle-size-docs-"));
    const filePath = path.join(directory, "bundle-size.json");

    try {
      await writeFile(filePath, "fixture");
      await expect(readBundleSizeText(filePath)).resolves.toBe("fixture");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});

describe("bundleSizeSchema", () => {
  it("normalizes valid root data to the field consumers use", () => {
    expect(
      bundleSizeSchema.parse({ passed: true, size: 580, sizeLimit: 600 }),
    ).toEqual({ size: 580 });
  });

  it.each([
    ["malformed data", {}],
    ["a non-positive size", { passed: true, size: 0, sizeLimit: 1 }],
    ["a non-integer size", { passed: true, size: 1.5, sizeLimit: 2 }],
    ["a failed result", { passed: false, size: 1, sizeLimit: 2 }],
    ["an over-budget result", { passed: true, size: 3, sizeLimit: 2 }],
  ])("rejects %s", (_label, data) => {
    expect(() => bundleSizeSchema.parse(data)).toThrow();
  });
});

describe("requiredBundleSizeEntry", () => {
  it("returns an entry and names the package missing a report", () => {
    expect(requiredBundleSizeEntry("entry", "class-variance-authority")).toBe(
      "entry",
    );
    expect(() => requiredBundleSizeEntry(undefined, "cva")).toThrow(
      "Missing cva bundle size report.",
    );
  });
});

describe("bundleSizeLoader", () => {
  it("reads both reports, validates them before writing, and clears the store", async () => {
    const watcher = new Watcher();
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor() });

    await loader.load(fixture.context);

    expect(watcher.paths).toEqual(
      BUNDLE_SIZE_SOURCES.map(({ reportPath }) => reportPath),
    );
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.parseData).toHaveBeenCalledTimes(2);
    expect(fixture.store.set).toHaveBeenCalledTimes(2);
    expect(fixture.store.set).toHaveBeenNthCalledWith(1, {
      id: "class-variance-authority",
      data: { size: 1000 },
    });
    expect(fixture.store.set).toHaveBeenNthCalledWith(2, {
      id: "cva",
      data: { size: 1001 },
    });
  });

  it.each([
    ["invalid JSON", "not json"],
    ["operational error", '{"error":"dist is missing"}'],
    ["non-array JSON", "{}"],
    ["missing root", "[]"],
    [
      "duplicate root",
      JSON.stringify([
        {
          name: BUNDLE_SIZE_SOURCES[0].buildEntry,
          passed: true,
          size: 1,
          sizeLimit: 2,
        },
        {
          name: BUNDLE_SIZE_SOURCES[0].buildEntry,
          passed: true,
          size: 1,
          sizeLimit: 2,
        },
      ]),
    ],
  ])(
    "rejects a %s report without retaining an entry",
    async (_label, value) => {
      const reports = new Map([
        [BUNDLE_SIZE_SOURCES[0].reportPath, value],
        [
          BUNDLE_SIZE_SOURCES[1].reportPath,
          report(BUNDLE_SIZE_SOURCES[1], 1001),
        ],
      ]);
      const fixture = context(undefined);
      const loader = bundleSizeLoader({ readTextImpl: readTextFor(reports) });

      await expect(loader.load(fixture.context)).rejects.toThrow();
      expect(fixture.store.clear).toHaveBeenCalledTimes(1);
      expect(fixture.store.set).not.toHaveBeenCalled();
    },
  );

  it("uses the production schema before store.set", async () => {
    const reports = new Map([
      [
        BUNDLE_SIZE_SOURCES[0].reportPath,
        JSON.stringify([
          {
            name: BUNDLE_SIZE_SOURCES[0].buildEntry,
            passed: false,
            size: 1000,
            sizeLimit: 1100,
          },
        ]),
      ],
      [BUNDLE_SIZE_SOURCES[1].reportPath, report(BUNDLE_SIZE_SOURCES[1], 1001)],
    ]);
    const fixture = context(undefined);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor(reports) });

    await expect(loader.load(fixture.context)).rejects.toThrow();
    expect(fixture.store.set).not.toHaveBeenCalled();
  });

  it("logs non-Error parser failures", async () => {
    const fixture = context(
      undefined,
      vi.fn(async () => {
        throw "invalid schema";
      }),
    );
    const loader = bundleSizeLoader({ readTextImpl: readTextFor() });

    await expect(loader.load(fixture.context)).rejects.toBe("invalid schema");
    expect(fixture.logger.error).toHaveBeenCalledWith("invalid schema");
  });

  it("refreshes only watched reports for change and add events", async () => {
    const watcher = new Watcher();
    const reports = new Map(
      BUNDLE_SIZE_SOURCES.map((source, index) => [
        source.reportPath,
        report(source, 1000 + index),
      ]),
    );
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor(reports) });

    await loader.load(fixture.context);
    watcher.emit("change", "/unrelated/file.json");
    await settle();
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);

    reports.set(
      BUNDLE_SIZE_SOURCES[0].reportPath,
      report(BUNDLE_SIZE_SOURCES[0], 2000),
    );
    watcher.emit("change", BUNDLE_SIZE_SOURCES[0].reportPath);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));

    reports.set(
      BUNDLE_SIZE_SOURCES[1].reportPath,
      report(BUNDLE_SIZE_SOURCES[1], 3000),
    );
    watcher.emit("add", BUNDLE_SIZE_SOURCES[1].reportPath);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(6));
    expect(fixture.store.set).toHaveBeenLastCalledWith({
      id: "cva",
      data: { size: 3000 },
    });
  });

  it("clears entries when an unlinked report cannot be re-read", async () => {
    const watcher = new Watcher();
    const reports = new Map(
      BUNDLE_SIZE_SOURCES.map((source, index) => [
        source.reportPath,
        report(source, 1000 + index),
      ]),
    );
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor(reports) });

    await loader.load(fixture.context);
    reports.delete(BUNDLE_SIZE_SOURCES[1].reportPath);
    watcher.emit("unlink", BUNDLE_SIZE_SOURCES[1].reportPath);
    await vi.waitFor(() =>
      expect(fixture.logger.error).toHaveBeenCalledTimes(1),
    );

    expect(fixture.store.clear).toHaveBeenCalledTimes(2);
    expect(fixture.store.set).toHaveBeenCalledTimes(2);
  });

  it("does not restore a stale refresh after a newer report wins", async () => {
    const watcher = new Watcher();
    const reports = new Map(
      BUNDLE_SIZE_SOURCES.map((source, index) => [
        source.reportPath,
        report(source, 1000 + index),
      ]),
    );
    let resolveStale: ((value: string) => void) | undefined;
    let stallStableRead = false;
    const readTextImpl: ReadText = async (filePath) => {
      if (stallStableRead && filePath === BUNDLE_SIZE_SOURCES[0].reportPath) {
        stallStableRead = false;
        return new Promise((resolve) => {
          resolveStale = resolve;
        });
      }
      const value = reports.get(filePath);
      if (value === undefined) throw new Error(`ENOENT: ${filePath}`);
      return value;
    };
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl });

    await loader.load(fixture.context);
    stallStableRead = true;
    watcher.emit("change", BUNDLE_SIZE_SOURCES[0].reportPath);
    await vi.waitFor(() => expect(resolveStale).toBeTypeOf("function"));
    reports.set(
      BUNDLE_SIZE_SOURCES[1].reportPath,
      report(BUNDLE_SIZE_SOURCES[1], 2000),
    );
    watcher.emit("change", BUNDLE_SIZE_SOURCES[1].reportPath);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));
    resolveStale?.(report(BUNDLE_SIZE_SOURCES[0], 1000));
    await settle();

    expect(fixture.store.set).toHaveBeenCalledTimes(4);
    expect(fixture.store.set).toHaveBeenLastCalledWith({
      id: "cva",
      data: { size: 2000 },
    });
  });

  it("does not log a stale refresh failure", async () => {
    const watcher = new Watcher();
    let rejectStale: ((reason: Error) => void) | undefined;
    let stallStableRead = false;
    const defaultReadText = readTextFor();
    const readTextImpl: ReadText = async (filePath) => {
      if (stallStableRead && filePath === BUNDLE_SIZE_SOURCES[0].reportPath) {
        stallStableRead = false;
        return new Promise((_resolve, reject) => {
          rejectStale = reject;
        });
      }
      return defaultReadText(filePath);
    };
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl });

    await loader.load(fixture.context);
    stallStableRead = true;
    watcher.emit("change", BUNDLE_SIZE_SOURCES[0].reportPath);
    await vi.waitFor(() => expect(rejectStale).toBeTypeOf("function"));
    watcher.emit("change", BUNDLE_SIZE_SOURCES[1].reportPath);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));
    rejectStale?.(new Error("stale report"));
    await settle();

    expect(fixture.logger.error).not.toHaveBeenCalled();
  });
});

describe("formatDecimalBytes", () => {
  it("uses decimal units with up to three significant digits", () => {
    expect(formatDecimalBytes(580)).toBe("580\u00a0B");
    expect(formatDecimalBytes(1000)).toBe("1\u00a0KB");
    expect(formatDecimalBytes(1624)).toBe("1.62\u00a0KB");
    expect(formatDecimalBytes(1_234_567)).toBe("1.23\u00a0MB");
  });
});
