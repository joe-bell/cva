import type { LoaderContext } from "astro/loaders";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type Fetch,
  type WeeklyDownload,
  WEEKLY_DOWNLOADS_ENDPOINT,
  WEEKLY_DOWNLOADS_TIMEOUT_MS,
  formatWeeklyDownloadDate,
  formatWeeklyDownloads,
  parseWeeklyDownloadsResponse,
  requiredWeeklyDownloadEntry,
  totalWeeklyDownloads,
  weeklyDownloadSchema,
  weeklyDownloadsLoader,
} from "./weekly-downloads";

function reports(
  stable: Partial<WeeklyDownload> = {},
  beta: Partial<WeeklyDownload> = {},
) {
  return {
    "class-variance-authority": {
      downloads: 45_324_438,
      package: "class-variance-authority" as const,
      start: "2024-02-01",
      end: "2024-02-07",
      ...stable,
    },
    cva: {
      downloads: 1_267_623,
      package: "cva" as const,
      start: "2024-02-01",
      end: "2024-02-07",
      ...beta,
    },
  };
}

function response(
  data: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
) {
  return {
    ok,
    status,
    json: async () => data,
  } as Response;
}

type ParseData = (entry: { id: string; data: unknown }) => Promise<unknown>;

function context(
  parseDataImpl: ParseData = async ({ data }) =>
    weeklyDownloadSchema.parse(data),
) {
  const entries = new Map<string, unknown>();
  const events: string[] = [];
  const parseData = vi.fn(
    async ({ id, data }: { id: string; data: unknown }) => {
      events.push(`parse:${id}`);
      return parseDataImpl({ id, data });
    },
  );
  const store = {
    clear: vi.fn(() => {
      events.push("clear");
      entries.clear();
    }),
    set: vi.fn(({ id, data }: { id: string; data: unknown }) => {
      events.push(`set:${id}`);
      entries.set(id, data);
    }),
  };

  return {
    context: {
      parseData,
      store,
    } as unknown as LoaderContext,
    entries,
    events,
    parseData,
    store,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("weekly npm download reports", () => {
  it("accepts the two expected reports and zero download counts", () => {
    const parsed = parseWeeklyDownloadsResponse(
      reports({ downloads: 0 }, { downloads: 0 }),
    );

    expect(parsed).toEqual(reports({ downloads: 0 }, { downloads: 0 }));
  });

  it.each([
    ["a malformed package record", () => ({ ...reports(), cva: null })],
    [
      "a missing package record",
      () => ({
        "class-variance-authority": reports()["class-variance-authority"],
      }),
    ],
    ["an extra package record", () => ({ ...reports(), other: reports().cva })],
    [
      "an extra field in a package record",
      () => ({ ...reports(), cva: { ...reports().cva, ignored: true } }),
    ],
  ])("rejects %s", (_label, data) => {
    expect(() => parseWeeklyDownloadsResponse(data())).toThrow();
  });

  it.each([
    ["the wrong stable package identity", reports({ package: "cva" })],
    [
      "the wrong beta package identity",
      reports({}, { package: "class-variance-authority" }),
    ],
    ["a negative count", reports({ downloads: -1 })],
    ["a fractional count", reports({ downloads: 1.5 })],
    ["an unsafe count", reports({ downloads: Number.MAX_SAFE_INTEGER + 1 })],
    ["an invalid date format", reports({ start: "2024-2-01" })],
    ["an impossible calendar date", reports({ start: "2024-02-30" })],
    [
      "different start dates",
      reports({}, { start: "2024-02-02", end: "2024-02-08" }),
    ],
    [
      "different end dates",
      reports({}, { start: "2024-02-01", end: "2024-02-08" }),
    ],
    ["an eight-day inclusive window", reports({ end: "2024-02-08" })],
    [
      "an unsafe combined total",
      reports({ downloads: Number.MAX_SAFE_INTEGER }, { downloads: 1 }),
    ],
  ])("rejects %s", (_label, data) => {
    expect(() => parseWeeklyDownloadsResponse(data)).toThrow();
  });
});

describe("weeklyDownloadsLoader", () => {
  it("uses the fixed bulk endpoint and parses both reports before replacing stale data", async () => {
    const fixture = context();
    fixture.entries.set("stale", "report");
    const fetchImpl = vi.fn(async () => response(reports()));

    await weeklyDownloadsLoader({ fetchImpl: fetchImpl as Fetch }).load(
      fixture.context,
    );

    expect(fetchImpl).toHaveBeenCalledWith(WEEKLY_DOWNLOADS_ENDPOINT, {
      signal: expect.any(AbortSignal),
    });
    expect(fixture.events).toEqual([
      "parse:class-variance-authority",
      "parse:cva",
      "clear",
      "set:class-variance-authority",
      "set:cva",
    ]);
    expect(fixture.entries).toEqual(
      new Map([
        ["class-variance-authority", reports()["class-variance-authority"]],
        ["cva", reports().cva],
      ]),
    );
  });

  it("replaces a previous collection snapshot on every load", async () => {
    const fixture = context();
    let data = reports({ downloads: 1 }, { downloads: 2 });
    const fetchImpl = vi.fn(async () => response(data));
    const loader = weeklyDownloadsLoader({ fetchImpl: fetchImpl as Fetch });

    await loader.load(fixture.context);
    data = reports({ downloads: 3 }, { downloads: 4 });
    await loader.load(fixture.context);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fixture.store.clear).toHaveBeenCalledTimes(2);
    expect(fixture.entries).toEqual(
      new Map([
        ["class-variance-authority", data["class-variance-authority"]],
        ["cva", data.cva],
      ]),
    );
  });

  it("clears stale entries when collection parsing fails", async () => {
    const fixture = context(async ({ id, data }) => {
      if (id === "cva") throw new Error("Invalid collection entry.");
      return weeklyDownloadSchema.parse(data);
    });
    fixture.entries.set("stale", "report");
    const fetchImpl = vi.fn(async () => response(reports()));

    await expect(
      weeklyDownloadsLoader({ fetchImpl: fetchImpl as Fetch }).load(
        fixture.context,
      ),
    ).rejects.toThrow("Invalid collection entry.");

    expect(fixture.parseData).toHaveBeenCalledTimes(2);
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.store.set).not.toHaveBeenCalled();
    expect(fixture.entries).toEqual(new Map());
  });

  it.each([
    ["an HTTP failure", async () => response({}, { ok: false, status: 503 })],
    [
      "invalid JSON",
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        }) as unknown as Response,
    ],
    [
      "a network failure",
      async () => Promise.reject(new Error("Network down")),
    ],
    ["a response validation failure", async () => response({})],
  ] as const)(
    "clears stale entries and throws on %s",
    async (_label, fetchImpl) => {
      const fixture = context();
      fixture.entries.set("stale", "report");

      await expect(
        weeklyDownloadsLoader({ fetchImpl }).load(fixture.context),
      ).rejects.toThrow();

      expect(fixture.parseData).not.toHaveBeenCalled();
      expect(fixture.store.clear).toHaveBeenCalledTimes(1);
      expect(fixture.store.set).not.toHaveBeenCalled();
      expect(fixture.entries).toEqual(new Map());
    },
  );

  it("bounds a stalled request and aborts its fetch", async () => {
    vi.useFakeTimers();

    const fixture = context();
    fixture.entries.set("stale", "report");
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const load = weeklyDownloadsLoader({ fetchImpl }).load(fixture.context);
    const rejection = expect(load).rejects.toThrow(
      `timed out after ${WEEKLY_DOWNLOADS_TIMEOUT_MS}ms`,
    );
    await vi.advanceTimersByTimeAsync(WEEKLY_DOWNLOADS_TIMEOUT_MS);

    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.entries).toEqual(new Map());
  });

  it("uses the remaining shared timeout after headers arrive", async () => {
    vi.useFakeTimers();

    const fixture = context();
    fixture.entries.set("stale", "report");
    let signal: AbortSignal | undefined;
    let resolveJson!: (data: unknown) => void;
    const json = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveJson = resolve;
        }),
    );
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          signal = init?.signal ?? undefined;
          setTimeout(() => {
            resolve({ ok: true, status: 200, json } as unknown as Response);
          }, 9_000);
        }),
    );

    const load = weeklyDownloadsLoader({ fetchImpl }).load(fixture.context);
    await vi.advanceTimersByTimeAsync(9_000);

    expect(json).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);

    const rejection = expect(load).rejects.toThrow(
      `timed out after ${WEEKLY_DOWNLOADS_TIMEOUT_MS}ms`,
    );
    await vi.advanceTimersByTimeAsync(WEEKLY_DOWNLOADS_TIMEOUT_MS - 9_000);

    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(fixture.parseData).not.toHaveBeenCalled();
    expect(fixture.store.clear).toHaveBeenCalledTimes(1);
    expect(fixture.store.set).not.toHaveBeenCalled();
    expect(fixture.entries).toEqual(new Map());
    expect(vi.getTimerCount()).toBe(0);

    resolveJson(reports());
    await Promise.resolve();

    expect(fixture.store.set).not.toHaveBeenCalled();
    expect(fixture.entries).toEqual(new Map());
  });
});

describe("weekly download component helpers", () => {
  it("requires entries and totals only safe counts", () => {
    expect(requiredWeeklyDownloadEntry("entry", "cva")).toBe("entry");
    expect(() =>
      requiredWeeklyDownloadEntry(undefined, "class-variance-authority"),
    ).toThrow("Missing class-variance-authority weekly download report.");
    expect(totalWeeklyDownloads(45_324_438, 1_267_623)).toBe(46_592_061);
    expect(() => totalWeeklyDownloads(Number.MAX_SAFE_INTEGER, 1)).toThrow(
      "Combined weekly download count must be a safe integer.",
    );
  });

  it("uses deterministic compact English counts and UTC dates", () => {
    expect(formatWeeklyDownloads(0)).toBe("0");
    expect(formatWeeklyDownloads(1_234_567)).toBe("1.2M");
    expect(formatWeeklyDownloads(1_249_999)).toBe("1.2M");
    expect(formatWeeklyDownloads(1_250_000)).toBe("1.3M");
    expect(formatWeeklyDownloads(45_324_438)).toBe("45.3M");
    expect(formatWeeklyDownloads(1_267_623)).toBe("1.3M");
    expect(formatWeeklyDownloads(46_592_061)).toBe("46.6M");
    expect(formatWeeklyDownloadDate("2024-03-10")).toBe("March 10, 2024");
  });
});
