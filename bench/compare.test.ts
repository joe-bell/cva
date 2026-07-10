import { describe, expect, it } from "vitest";

import { renderMarkdown, validateResult } from "./compare";

function validResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    package: "cva",
    node: "v24.18.0",
    os: "linux x64",
    commit: "abc1234",
    timestamp: "2026-07-10T00:00:00.000Z",
    implementations: [
      {
        label: "local",
        version: "1.0.0-beta.5",
        tasks: [
          { name: "cva: create", hz: 100, mean: 0.01, rme: 0.5, samples: 1000 },
        ],
      },
      {
        label: "prerelease",
        version: "1.0.0-beta.4",
        tasks: [
          { name: "cva: create", hz: 90, mean: 0.011, rme: 0.6, samples: 900 },
        ],
      },
      { label: "release", version: "0.7.1", skipped: "not published on npm" },
    ],
    ...overrides,
  };
}

describe("validateResult", () => {
  it("accepts a well-formed result", () => {
    expect(() => validateResult(validResult(), "cva")).not.toThrow();
  });

  it("rejects a package mismatch", () => {
    expect(() =>
      validateResult(
        validResult({ package: "class-variance-authority" }),
        "cva",
      ),
    ).toThrow(/does not match/);
  });

  it("rejects unknown top-level keys", () => {
    expect(() =>
      validateResult({ ...validResult(), extra: "nope" }, "cva"),
    ).toThrow(/unexpected key/);
  });

  it("rejects an unsupported schemaVersion", () => {
    expect(() =>
      validateResult(validResult({ schemaVersion: 2 }), "cva"),
    ).toThrow(/unsupported schemaVersion/);
  });

  it("rejects a non-array implementations field", () => {
    expect(() =>
      validateResult(validResult({ implementations: "nope" }), "cva"),
    ).toThrow(/must be a non-empty array/);
  });

  it("rejects too many implementations", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      label: "local",
      version: `1.0.${i}`,
      tasks: [{ name: "x", hz: 1, mean: 1, rme: 1, samples: 1 }],
    }));
    expect(() =>
      validateResult(validResult({ implementations: many }), "cva"),
    ).toThrow(/exceeds the maximum/);
  });

  it("rejects an implementation with both tasks and skipped", () => {
    const bad = validResult();
    (bad.implementations[0] as Record<string, unknown>).skipped = "bogus";
    expect(() => validateResult(bad, "cva")).toThrow(/exactly one of/);
  });

  it("rejects an unknown implementation label", () => {
    const bad = validResult();
    (bad.implementations[0] as Record<string, unknown>).label = "evil";
    expect(() => validateResult(bad, "cva")).toThrow(
      /unexpected implementation label/,
    );
  });

  it("rejects a non-finite metric (NaN/Infinity injection)", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].hz = Number.POSITIVE_INFINITY;
    expect(() => validateResult(bad, "cva")).toThrow(/finite/);
  });

  it("rejects negative metrics", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].hz = -1;
    expect(() => validateResult(bad, "cva")).toThrow(/finite/);
  });

  it("rejects a non-integer sample count", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].samples = 1.5;
    expect(() => validateResult(bad, "cva")).toThrow(/integer/);
  });

  it("rejects an oversized task name", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].name = "x".repeat(500);
    expect(() => validateResult(bad, "cva")).toThrow(/non-empty string/);
  });

  it("rejects too many tasks", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks = Array.from(
      { length: 100 },
      (_, i) => ({
        name: `task-${i}`,
        hz: 1,
        mean: 1,
        rme: 1,
        samples: 1,
      }),
    );
    expect(() => validateResult(bad, "cva")).toThrow(/at most/);
  });

  it("rejects a malformed commit sha", () => {
    expect(() =>
      validateResult(validResult({ commit: "'; DROP TABLE users;--" }), "cva"),
    ).toThrow(/unexpected format/);
  });

  it("rejects an invalid timestamp", () => {
    expect(() =>
      validateResult(validResult({ timestamp: "not a date" }), "cva"),
    ).toThrow(/valid date/);
  });
});

describe("renderMarkdown", () => {
  it("escapes markdown-hostile task names and never emits raw pipes/backticks", () => {
    const result = validResult();
    (result.implementations[0] as any).tasks[0].name = "a | b `c` <script>&";
    const validated = validateResult(result, "cva");
    const markdown = renderMarkdown([validated]);

    expect(markdown).toContain("a \\| b 'c' &lt;script&gt;&amp;");
    expect(markdown).not.toContain("<script>");
  });

  it("renders a skipped-baseline note", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("not published on npm");
  });

  it("renders a delta between local and a baseline", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toMatch(/\+\d+\.\d%/);
  });
});
