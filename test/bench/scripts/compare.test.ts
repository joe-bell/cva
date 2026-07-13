import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  renderMarkdown,
  sanitizeSkippedReason,
  validateResult,
  validateResults,
} from "./compare";

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
          {
            name: "Create component (one-time setup)",
            hz: 100,
            mean: 0.01,
            rme: 0.5,
            samples: 1000,
          },
        ],
      },
      {
        label: "prerelease",
        version: "1.0.0-beta.4",
        tasks: [
          {
            name: "Create component (one-time setup)",
            hz: 90,
            mean: 0.011,
            rme: 0.6,
            samples: 900,
          },
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
    ).toThrow(/unexpected format/);
  });

  it("rejects a timestamp without milliseconds", () => {
    expect(() =>
      validateResult(validResult({ timestamp: "2026-07-10T00:00:00Z" }), "cva"),
    ).toThrow(/unexpected format/);
  });

  it("rejects a timestamp with a numeric offset", () => {
    expect(() =>
      validateResult(
        validResult({ timestamp: "2026-07-10T00:00:00.000+00:00" }),
        "cva",
      ),
    ).toThrow(/unexpected format/);
  });

  it("rejects a timestamp that parses but does not round-trip toISOString()", () => {
    expect(() =>
      validateResult(
        validResult({ timestamp: "2026-07-10T24:00:00.000Z" }),
        "cva",
      ),
    ).toThrow(/canonical UTC/);
  });

  it("rejects a task name containing markdown link syntax", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].name =
      "[click here](https://phish.example)";
    expect(() => validateResult(bad, "cva")).toThrow(/unexpected format/);
  });

  it("rejects a task name containing markdown image syntax", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].name =
      "![x](https://attacker.example/pixel.png)";
    expect(() => validateResult(bad, "cva")).toThrow(/unexpected format/);
  });

  it("rejects a task name containing a bare URL", () => {
    const bad = validResult();
    (bad.implementations[0] as any).tasks[0].name =
      "https://attacker.example/track";
    expect(() => validateResult(bad, "cva")).toThrow(/unexpected format/);
  });

  it("rejects a skipped reason containing a bare URL", () => {
    const bad = validResult();
    (bad.implementations[2] as any).skipped =
      "details at https://attacker.example/login";
    expect(() => validateResult(bad, "cva")).toThrow(
      /disallowed URL or mention/,
    );
  });

  it("rejects a skipped reason containing an @mention", () => {
    const bad = validResult();
    (bad.implementations[2] as any).skipped = "ping @maintainer for access";
    expect(() => validateResult(bad, "cva")).toThrow(/unexpected format/);
  });
});

describe("renderMarkdown", () => {
  it("renders skipped reasons inside inline code", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);

    expect(markdown).toContain("— `not published on npm`._");
  });

  it("renders a skipped-baseline note", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("not published on npm");
  });

  it("includes the contributor-facing benchmark disclaimer", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("These benchmarks ran in CI on this PR's code");
    expect(markdown).toContain("re-run the benchmarks locally");
  });

  it("uses the simplified benchmark intro copy", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);

    expect(markdown).toContain(
      "Comparing this PR's local benchmark run against the latest published npm versions.",
    );
    expect(markdown).not.toContain("dist-tags");
    expect(markdown).toContain(
      "Aim for higher ops/s. Treat deltas within ±5% as noise.",
    );
    expect(markdown).not.toContain("### How to read this");
  });

  it("renders the maintenance-mode toolchain note for class-variance-authority", () => {
    const result = validResult({
      package: "class-variance-authority",
      implementations: [
        {
          label: "local",
          version: "0.7.1",
          tasks: [
            {
              name: "Join class names",
              hz: 100,
              mean: 0.01,
              rme: 0.5,
              samples: 1000,
            },
          ],
        },
        {
          label: "release",
          version: "0.7.1",
          tasks: [
            {
              name: "Join class names",
              hz: 90,
              mean: 0.011,
              rme: 0.6,
              samples: 900,
            },
          ],
        },
      ],
    });
    const markdown = renderMarkdown([
      validateResult(result, "class-variance-authority"),
    ]);

    expect(markdown).toContain("> [!NOTE]");
    expect(markdown).toContain("predates the `tsdown` build migration");
    // The note sits under the heading, above the table.
    expect(markdown.indexOf("> [!NOTE]")).toBeLessThan(
      markdown.indexOf("| Task |"),
    );
  });

  it("omits the toolchain note when the release baseline is skipped", () => {
    const result = validResult({
      package: "class-variance-authority",
      implementations: [
        {
          label: "local",
          version: "0.7.1",
          tasks: [
            {
              name: "Join class names",
              hz: 100,
              mean: 0.01,
              rme: 0.5,
              samples: 1000,
            },
          ],
        },
        { label: "release", version: "0.7.1", skipped: "not published on npm" },
      ],
    });
    const markdown = renderMarkdown([
      validateResult(result, "class-variance-authority"),
    ]);

    expect(markdown).not.toContain("> [!NOTE]");
  });

  it("does not render the toolchain note for cva", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);

    expect(markdown).not.toContain("> [!NOTE]");
  });

  it("renders runtime rows before static rows with display labels", () => {
    const result = validResult();
    const tasks = (result.implementations[0] as any).tasks;
    tasks.push({
      name: "Call component (default variants)",
      hz: 100,
      mean: 0.01,
      rme: 0.5,
      samples: 1000,
    });
    (result.implementations[1] as any).tasks.push({
      name: "Call component (default variants)",
      hz: 90,
      mean: 0.011,
      rme: 0.6,
      samples: 900,
    });

    const markdown = renderMarkdown([validateResult(result, "cva")]);
    expect(markdown).toContain(
      "**`cva`** (runtime)<br />_component call with defaults_",
    );
    expect(markdown).toContain(
      "**`cva`** (static)<br />_component definition_",
    );
    expect(markdown.indexOf("_component call with defaults_")).toBeLessThan(
      markdown.indexOf("_component definition_"),
    );
  });

  it("renders prerelease baselines with the beta dist-tag label", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("`1.0.0-beta.4` (`beta`)");
  });

  it("renders a delta between local and a baseline", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toMatch(/\+\d+\.\d%/);
  });

  it("marks a delta beyond +5% with 🟢 (local is 100, baseline is 90 — +11.1%)", () => {
    const validated = validateResult(validResult(), "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("🟢 +11.1%");
  });

  it("marks a delta beyond -5% with 🔴 (a regression)", () => {
    const result = validResult();
    (result.implementations[0] as any).tasks[0].hz = 70;
    (result.implementations[1] as any).tasks[0].hz = 100;
    const validated = validateResult(result, "cva");
    const markdown = renderMarkdown([validated]);
    expect(markdown).toContain("🔴 -30.0%");
  });

  it("leaves an in-noise delta (within ±5%) unmarked", () => {
    const result = validResult();
    (result.implementations[0] as any).tasks[0].hz = 100;
    (result.implementations[1] as any).tasks[0].hz = 98;
    const validated = validateResult(result, "cva");
    const markdown = renderMarkdown([validated]);
    const row = markdown
      .split("\n")
      .find((line) => line.includes("_component definition_"));
    expect(row).toContain("+2.0%");
    expect(row).not.toContain("🟢");
    expect(row).not.toContain("🔴");
  });

  it("renders — instead of a delta when the baseline hz is zero", () => {
    const result = validResult();
    (result.implementations[1] as any).tasks[0].hz = 0;
    const validated = validateResult(result, "cva");
    const markdown = renderMarkdown([validated]);
    const row = markdown
      .split("\n")
      .find((line) => line.includes("_component definition_"));
    expect(row).toBeDefined();
    expect(row).not.toMatch(/Infinity|NaN/);
  });

  it("still renders baseline rows when the local implementation is skipped", () => {
    const result = validResult({
      implementations: [
        { label: "local", version: "1.0.0-beta.5", skipped: "build missing" },
        {
          label: "prerelease",
          version: "1.0.0-beta.4",
          tasks: [
            {
              name: "Create component (one-time setup)",
              hz: 90,
              mean: 0.011,
              rme: 0.6,
              samples: 900,
            },
          ],
        },
      ],
    });
    const validated = validateResult(result, "cva");
    const markdown = renderMarkdown([validated]);
    const row = markdown
      .split("\n")
      .find((line) => line.includes("_component definition_"));
    expect(row).toBeDefined();
    expect(row).toContain("90 ops/s");
    expect(row).toContain("| — |");
    expect(markdown).toContain("No local benchmark results");
  });
});

describe("validateResults", () => {
  function writeResultDir(files: Record<string, string>) {
    const dir = mkdtempSync(path.join(tmpdir(), "cva-compare-test-"));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), content);
    }
    return dir;
  }

  it("reads only allowlisted filenames, ignoring strays", () => {
    const dir = writeResultDir({
      "benchmark-cva.json": JSON.stringify(validResult()),
      "meta.json": '{ "pr": 1 }',
      "vitest-bench.json": "{}",
      "benchmark-evil.json": '{"not": "validated"}',
    });
    const results = validateResults(dir);
    expect(results).toHaveLength(1);
    expect(results[0].package).toBe("cva");
  });

  it("rejects an allowlisted file over the size cap", () => {
    const oversized = JSON.stringify(validResult()).padEnd(513 * 1024, " ");
    const dir = writeResultDir({ "benchmark-cva.json": oversized });
    expect(() => validateResults(dir)).toThrow(/byte cap/);
  });

  it("fails loudly when no benchmark files are present", () => {
    const dir = writeResultDir({ "meta.json": '{ "pr": 1 }' });
    expect(() => validateResults(dir)).toThrow(/no benchmark result files/);
  });
});

describe("sanitizeSkippedReason", () => {
  // The producer (report.ts) runs baseline skip reasons through this so a
  // real tool error can't trip validateResult's allowlist and suppress the
  // whole comment. Each sanitized reason must round-trip cleanly.
  const realWorldReasons = [
    "failed to install: No matching version found for cva@9.9.9",
    "failed to resolve npm dist-tags: request to https://registry.npmjs.org/cva failed",
    "failed to install: GET https://registry.npmjs.org/cva: Not Found - 404",
    "ping @maintainer",
    "no beta dist-tag on npm",
  ];

  for (const reason of realWorldReasons) {
    it(`produces an allowlist-valid reason for: ${reason.slice(0, 32)}…`, () => {
      const sanitized = sanitizeSkippedReason(reason);
      const result = {
        schemaVersion: 1,
        package: "cva",
        node: "v24.0.0",
        os: "linux x64",
        commit: "abc1234",
        timestamp: "2026-07-10T00:00:00.000Z",
        implementations: [
          { label: "prerelease", version: "1.0.0-beta.6", skipped: sanitized },
        ],
      };
      expect(() => validateResult(result, "cva")).not.toThrow();
      expect(sanitized).not.toMatch(/@|https?:\/\//);
    });
  }

  it("never returns an empty string", () => {
    expect(sanitizeSkippedReason("@@@")).toBe("at at at");
    expect(sanitizeSkippedReason("")).toBe("unavailable");
    expect(sanitizeSkippedReason("https://x")).toBe("url");
  });

  it("caps very long reasons at the allowlist limit", () => {
    expect(sanitizeSkippedReason("x".repeat(500)).length).toBeLessThanOrEqual(
      200,
    );
  });
});
