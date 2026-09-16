import type { LoaderContext } from "astro/loaders";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BUNDLE_SIZE_ARTIFACT_PATH,
  BUNDLE_SIZE_SOURCES,
  bundleSizeArtifactSchema,
  bundleSizeLoader,
  bundleSizeSchema,
  formatDecimalBytes,
  parseBundleSizeArtifact,
  readBundleSizeEntries,
  readBundleSizeText,
  requiredBundleSizeEntry,
  type ReadText,
} from "./bundle-size";

const directories: string[] = [];

function createWatcher() {
  const paths: string[] = [];
  const listeners = new Map<string, (changedPath: string) => void>();

  return {
    paths,
    add(pathsToWatch: string[]) {
      paths.push(...pathsToWatch);
    },
    on(event: string, listener: (changedPath: string) => void) {
      listeners.set(event, listener);
    },
    emit(event: string, changedPath: string) {
      listeners.get(event)?.(changedPath);
    },
  };
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

function data(size: number) {
  return { passed: true, size, sizeLimit: size + 100 } as const;
}

function artifactFor(
  sizes: Record<string, number> = {
    "class-variance-authority": 580,
    cva: 1624,
  },
) {
  return JSON.stringify(
    Object.fromEntries(
      BUNDLE_SIZE_SOURCES.map(({ package: packageName }) => [
        packageName,
        data(sizes[packageName]!),
      ]),
    ),
  );
}

function readTextFor(text: string = artifactFor()): ReadText {
  return async (filePath) => {
    if (filePath !== BUNDLE_SIZE_ARTIFACT_PATH) {
      throw new Error(`Unexpected read: ${filePath}`);
    }
    return text;
  };
}

function context(
  watcher: ReturnType<typeof createWatcher> | undefined,
  parseData = vi.fn(async ({ data: entryData }: { data: unknown }) =>
    bundleSizeSchema.parse(entryData),
  ),
) {
  const entries = new Map<string, unknown>();
  const store = {
    clear: vi.fn(() => entries.clear()),
    set: vi.fn(({ id, data: entryData }: { id: string; data: unknown }) => {
      entries.set(id, entryData);
    }),
  };
  const logger = { error: vi.fn() };

  return {
    context: {
      logger,
      parseData,
      store,
      watcher,
    } as unknown as LoaderContext,
    logger,
    parseData,
    entries,
    store,
  };
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("bundle size artifact", () => {
  it("reads the one docs-owned artifact and keys entries by package name", async () => {
    await expect(readBundleSizeEntries(readTextFor())).resolves.toEqual([
      {
        id: "class-variance-authority",
        data: data(580),
      },
      { id: "cva", data: data(1624) },
    ]);
  });

  it("reads text from a supplied artifact path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bundle-size-docs-"));
    directories.push(directory);
    const artifactPath = path.join(directory, "bundle-sizes.json");
    await writeFile(artifactPath, "fixture");

    await expect(readBundleSizeText(artifactPath)).resolves.toBe("fixture");
  });

  it("rejects malformed JSON before exposing collection entries", () => {
    expect(() => parseBundleSizeArtifact("not json")).toThrow(
      "Invalid JSON in bundle size artifact.",
    );
  });

  it.each([
    ["a failed measurement", { passed: false, size: 1, sizeLimit: 2 }],
    ["an over-budget measurement", { passed: true, size: 3, sizeLimit: 2 }],
    ["an extra field", { passed: true, size: 1, sizeLimit: 2, ignored: true }],
  ])("has Zod reject %s", (_label, value) => {
    expect(() => bundleSizeSchema.parse(value)).toThrow();
  });

  it("requires exactly the registry packages", () => {
    expect(() =>
      bundleSizeArtifactSchema.parse({
        cva: data(1624),
      }),
    ).toThrow();
    expect(() =>
      bundleSizeArtifactSchema.parse({
        "class-variance-authority": data(580),
        cva: data(1624),
        extra: data(1),
      }),
    ).toThrow();
  });
});

describe("bundleSizeLoader", () => {
  it("validates the complete artifact before replacing collection entries", async () => {
    const watcher = createWatcher();
    const fixture = context(watcher);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor() });

    await loader.load(fixture.context);

    expect(watcher.paths).toEqual([BUNDLE_SIZE_ARTIFACT_PATH]);
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.parseData).toHaveBeenCalledTimes(2);
    expect(fixture.store.set).toHaveBeenNthCalledWith(1, {
      id: "class-variance-authority",
      data: data(580),
    });
    expect(fixture.store.set).toHaveBeenNthCalledWith(2, {
      id: "cva",
      data: data(1624),
    });
  });

  it("fails closed for an invalid initial artifact and leaves the store empty", async () => {
    const fixture = context(undefined);
    const loader = bundleSizeLoader({ readTextImpl: readTextFor("{}") });

    await expect(loader.load(fixture.context)).rejects.toThrow();
    expect(fixture.logger.error).toHaveBeenCalledTimes(1);
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.store.set).not.toHaveBeenCalled();
    expect(fixture.entries).toEqual(new Map());
  });

  it("refreshes only when the shared artifact changes", async () => {
    const watcher = createWatcher();
    let text = artifactFor();
    const fixture = context(watcher);
    const loader = bundleSizeLoader({
      readTextImpl: async () => text,
    });

    await loader.load(fixture.context);
    watcher.emit("change", "/unrelated/file.json");
    await settle();
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);

    text = artifactFor({ "class-variance-authority": 580, cva: 1600 });
    watcher.emit("change", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));
    expect(fixture.store.set).toHaveBeenLastCalledWith({
      id: "cva",
      data: data(1600),
    });
  });

  it("clears previous entries after a current watcher failure", async () => {
    const watcher = createWatcher();
    let text = artifactFor();
    const fixture = context(watcher);
    const loader = bundleSizeLoader({
      readTextImpl: async () => text,
    });

    await loader.load(fixture.context);
    text = "not json";
    watcher.emit("unlink", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() =>
      expect(fixture.logger.error).toHaveBeenCalledTimes(1),
    );

    expect(fixture.store.clear).toHaveBeenCalledTimes(2);
    expect(fixture.store.set).toHaveBeenCalledTimes(2);
    expect(fixture.entries).toEqual(new Map());
  });

  it("does not restore a stale refresh after a newer artifact wins", async () => {
    const watcher = createWatcher();
    let text = artifactFor();
    let resolveStale: ((value: string) => void) | undefined;
    let stallNextRead = false;
    const fixture = context(watcher);
    const loader = bundleSizeLoader({
      readTextImpl: async () => {
        if (stallNextRead) {
          stallNextRead = false;
          return new Promise((resolve) => {
            resolveStale = resolve;
          });
        }
        return text;
      },
    });

    await loader.load(fixture.context);
    stallNextRead = true;
    watcher.emit("add", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() => expect(resolveStale).toBeTypeOf("function"));

    text = artifactFor({ "class-variance-authority": 570, cva: 1600 });
    watcher.emit("change", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));
    resolveStale?.(artifactFor());
    await settle();

    expect(fixture.store.set).toHaveBeenCalledTimes(4);
    expect(fixture.store.set).toHaveBeenLastCalledWith({
      id: "cva",
      data: data(1600),
    });
  });

  it("does not log or clear newer entries for a stale refresh failure", async () => {
    const watcher = createWatcher();
    let text = artifactFor();
    let rejectStale: ((reason: Error) => void) | undefined;
    let stallNextRead = false;
    const fixture = context(watcher);
    const loader = bundleSizeLoader({
      readTextImpl: async () => {
        if (stallNextRead) {
          stallNextRead = false;
          return new Promise((_resolve, reject) => {
            rejectStale = reject;
          });
        }
        return text;
      },
    });

    await loader.load(fixture.context);
    stallNextRead = true;
    watcher.emit("change", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() => expect(rejectStale).toBeTypeOf("function"));

    text = artifactFor({ "class-variance-authority": 580, cva: 1600 });
    watcher.emit("change", BUNDLE_SIZE_ARTIFACT_PATH);
    await vi.waitFor(() => expect(fixture.store.set).toHaveBeenCalledTimes(4));
    expect(fixture.store.clear).toHaveBeenCalledTimes(2);
    rejectStale?.(new Error("stale artifact"));
    await settle();

    expect(fixture.logger.error).not.toHaveBeenCalled();
    expect(fixture.store.clear).toHaveBeenCalledTimes(2);
    expect(fixture.entries).toEqual(
      new Map([
        ["class-variance-authority", data(580)],
        ["cva", data(1600)],
      ]),
    );
  });
});

describe("component helpers", () => {
  it("requires an entry and keeps the measurement unit unbroken", () => {
    expect(requiredBundleSizeEntry("entry", "class-variance-authority")).toBe(
      "entry",
    );
    expect(() => requiredBundleSizeEntry(undefined, "cva")).toThrow(
      "Missing cva bundle size report.",
    );
    expect(formatDecimalBytes(580)).toBe("580\u00a0B");
    expect(formatDecimalBytes(1624)).toBe("1.62\u00a0KB");
    expect(formatDecimalBytes(1_234_567)).toBe("1.23\u00a0MB");
  });
});
