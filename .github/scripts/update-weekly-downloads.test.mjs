import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MINIMUM_WEEKLY_DOWNLOAD_RATIO,
  WEEKLY_DOWNLOADS_ENDPOINT,
  assertPlausibleWeeklyDownloads,
  fetchWeeklyDownloads,
  parseWeeklyDownloadsResponse,
  parseWeeklyDownloadsSnapshot,
  serializeWeeklyDownloads,
  updateWeeklyDownloads,
} from "./update-weekly-downloads.mjs";

function reports(stable = {}, beta = {}) {
  return {
    "class-variance-authority": {
      downloads: 45_324_438,
      package: "class-variance-authority",
      start: "2024-02-01",
      end: "2024-02-07",
      ...stable,
    },
    cva: {
      downloads: 1_267_623,
      package: "cva",
      start: "2024-02-01",
      end: "2024-02-07",
      ...beta,
    },
  };
}

function response(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

const expectedSnapshot = {
  start: "2024-02-01",
  end: "2024-02-07",
  packages: {
    "class-variance-authority": 45_324_438,
    cva: 1_267_623,
  },
};

const previousSnapshot = {
  start: "2024-01-25",
  end: "2024-01-31",
  packages: {
    "class-variance-authority": 44_000_000,
    cva: 1_000_000,
  },
};

afterEach(() => {
  vi.useRealTimers();
});

describe("parseWeeklyDownloadsResponse", () => {
  it("converts the two expected npm reports into one snapshot", () => {
    expect(parseWeeklyDownloadsResponse(reports())).toEqual(expectedSnapshot);
    expect(
      parseWeeklyDownloadsResponse(reports({ downloads: 0 }, { downloads: 0 }))
        .packages,
    ).toEqual({ "class-variance-authority": 0, cva: 0 });
  });

  it.each([
    ["a non-object response", null],
    ["an array response", []],
    ["a missing package", { cva: reports().cva }],
    ["an extra package", { ...reports(), other: reports().cva }],
    ["a malformed report", { ...reports(), cva: null }],
    [
      "an extra report field",
      { ...reports(), cva: { ...reports().cva, extra: true } },
    ],
    ["the wrong stable identity", reports({ package: "cva" })],
    ["the wrong beta identity", reports({}, { package: "other" })],
    ["a negative count", reports({ downloads: -1 })],
    ["a fractional count", reports({ downloads: 1.5 })],
    ["an unsafe count", reports({ downloads: Number.MAX_SAFE_INTEGER + 1 })],
    ["a non-string date", reports({ start: 1 })],
    ["an invalid date format", reports({ start: "2024-2-01" })],
    ["an impossible date", reports({ start: "2024-02-30" })],
    ["different start dates", reports({}, { start: "2024-02-02" })],
    ["different end dates", reports({}, { end: "2024-02-08" })],
    [
      "an eight-day inclusive window",
      reports({ end: "2024-02-08" }, { end: "2024-02-08" }),
    ],
    [
      "an unsafe combined total",
      reports({ downloads: Number.MAX_SAFE_INTEGER }, { downloads: 1 }),
    ],
  ])("rejects %s", (_label, data) => {
    expect(() => parseWeeklyDownloadsResponse(data)).toThrow();
  });
});

describe("parseWeeklyDownloadsSnapshot", () => {
  it("accepts the stored snapshot shape", () => {
    expect(parseWeeklyDownloadsSnapshot(expectedSnapshot)).toEqual(
      expectedSnapshot,
    );
  });

  it.each([
    ["a non-object snapshot", null],
    ["an extra snapshot field", { ...expectedSnapshot, extra: true }],
    ["a non-object packages field", { ...expectedSnapshot, packages: null }],
    [
      "a missing package",
      {
        ...expectedSnapshot,
        packages: { cva: expectedSnapshot.packages.cva },
      },
    ],
    ["a non-string date", { ...expectedSnapshot, start: 1 }],
    ["an invalid date format", { ...expectedSnapshot, start: "2024-2-01" }],
    ["an invalid date", { ...expectedSnapshot, end: "2024-02-30" }],
  ])("rejects %s", (_label, snapshot) => {
    expect(() => parseWeeklyDownloadsSnapshot(snapshot)).toThrow();
  });
});

describe("assertPlausibleWeeklyDownloads", () => {
  it("accepts a newer snapshot at the minimum ratio", () => {
    const previous = {
      ...previousSnapshot,
      packages: {
        "class-variance-authority":
          expectedSnapshot.packages["class-variance-authority"] /
          MINIMUM_WEEKLY_DOWNLOAD_RATIO,
        cva: expectedSnapshot.packages.cva / MINIMUM_WEEKLY_DOWNLOAD_RATIO,
      },
    };

    expect(() =>
      assertPlausibleWeeklyDownloads(expectedSnapshot, previous),
    ).not.toThrow();
  });

  it.each(["class-variance-authority", "cva"])(
    "rejects an unusually low %s count",
    (packageName) => {
      const previous = {
        ...previousSnapshot,
        packages: {
          ...expectedSnapshot.packages,
          [packageName]:
            expectedSnapshot.packages[packageName] /
              MINIMUM_WEEKLY_DOWNLOAD_RATIO +
            1,
        },
      };

      expect(() =>
        assertPlausibleWeeklyDownloads(expectedSnapshot, previous),
      ).toThrow(packageName);
    },
  );

  it("rejects a snapshot older than the current one", () => {
    expect(() =>
      assertPlausibleWeeklyDownloads(previousSnapshot, expectedSnapshot),
    ).toThrow("older than the current snapshot");
  });
});

describe("fetchWeeklyDownloads", () => {
  it("uses the fixed npm endpoint without redirects", async () => {
    const fetchImpl = vi.fn(async () => response(reports()));

    await expect(fetchWeeklyDownloads(fetchImpl)).resolves.toEqual(
      expectedSnapshot,
    );
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      WEEKLY_DOWNLOADS_ENDPOINT,
      {
        redirect: "error",
        signal: expect.any(AbortSignal),
      },
    );
  });

  it.each([
    ["an HTTP failure", async () => response({}, { ok: false, status: 503 })],
    [
      "invalid JSON",
      async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      }),
    ],
    ["a network failure", async () => Promise.reject(new Error("offline"))],
    ["an invalid response", async () => response({})],
  ])("fails on %s", async (_label, fetchImpl) => {
    await expect(fetchWeeklyDownloads(fetchImpl)).rejects.toThrow();
  });

  it("uses one timeout for the request and JSON body", async () => {
    vi.useFakeTimers();

    let signal;
    let resolveJson;
    const json = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveJson = resolve;
        }),
    );
    const fetchImpl = vi.fn(
      (_input, init) =>
        new Promise((resolve) => {
          signal = init.signal;
          setTimeout(() => resolve({ ok: true, status: 200, json }), 9_000);
        }),
    );

    const request = fetchWeeklyDownloads(fetchImpl);
    await vi.advanceTimersByTimeAsync(9_000);
    expect(json).toHaveBeenCalledOnce();

    const rejection = expect(request).rejects.toThrow(
      "timed out after 10000ms",
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;

    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    resolveJson(reports());
    await Promise.resolve();
  });
});

describe("updateWeeklyDownloads", () => {
  const content = serializeWeeklyDownloads(expectedSnapshot);
  const fetchImpl = vi.fn(async () => response(reports()));

  it("writes a changed snapshot", async () => {
    const readFileImpl = vi.fn(async () =>
      serializeWeeklyDownloads(previousSnapshot),
    );
    const writeFileImpl = vi.fn(async () => undefined);

    await expect(
      updateWeeklyDownloads({ fetchImpl, readFileImpl, writeFileImpl }),
    ).resolves.toEqual({ changed: true, snapshot: expectedSnapshot });
    expect(writeFileImpl).toHaveBeenCalledExactlyOnceWith(
      expect.any(URL),
      content,
      "utf8",
    );
  });

  it("does not rewrite an unchanged snapshot", async () => {
    const readFileImpl = vi.fn(async () => content);
    const writeFileImpl = vi.fn();

    await expect(
      updateWeeklyDownloads({ fetchImpl, readFileImpl, writeFileImpl }),
    ).resolves.toEqual({ changed: false, snapshot: expectedSnapshot });
    expect(writeFileImpl).not.toHaveBeenCalled();
  });

  it("creates a missing snapshot", async () => {
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    const readFileImpl = vi.fn(async () => Promise.reject(missing));
    const writeFileImpl = vi.fn(async () => undefined);

    await expect(
      updateWeeklyDownloads({ fetchImpl, readFileImpl, writeFileImpl }),
    ).resolves.toMatchObject({ changed: true });
    expect(writeFileImpl).toHaveBeenCalledOnce();
  });

  it("preserves unexpected read errors", async () => {
    const readError = new Error("permission denied");
    const readFileImpl = vi.fn(async () => Promise.reject(readError));

    await expect(
      updateWeeklyDownloads({ fetchImpl, readFileImpl }),
    ).rejects.toBe(readError);
  });

  it("does not write an implausibly low snapshot", async () => {
    const fetchImpl = vi.fn(async () =>
      response(
        reports({
          downloads:
            expectedSnapshot.packages["class-variance-authority"] *
              MINIMUM_WEEKLY_DOWNLOAD_RATIO -
            1,
        }),
      ),
    );
    const readFileImpl = vi.fn(async () => content);
    const writeFileImpl = vi.fn();

    await expect(
      updateWeeklyDownloads({ fetchImpl, readFileImpl, writeFileImpl }),
    ).rejects.toThrow("class-variance-authority");
    expect(writeFileImpl).not.toHaveBeenCalled();
  });
});
