import { describe, expect, it } from "vitest";

import { renderMarkdown, validateResult } from "./compare";

const result = validateResult(
  {
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
          {
            name: "Call component (default variants)",
            hz: 200,
            mean: 0.005,
            rme: 0.25,
            samples: 1000,
          },
          {
            name: "Join class names",
            hz: 300,
            mean: 0.003,
            rme: 0.75,
            samples: 1000,
          },
        ],
      },
      {
        label: "release",
        version: "0.7.1",
        tasks: [
          {
            name: "Create component (one-time setup)",
            hz: 0,
            mean: 0,
            rme: 0.6,
            samples: 900,
          },
          {
            name: "Call component (default variants)",
            hz: 180,
            mean: 0.006,
            rme: 0.4,
            samples: 900,
          },
          {
            name: "Join class names",
            hz: 270,
            mean: 0.004,
            rme: 0.8,
            samples: 900,
          },
        ],
      },
    ],
  },
  "cva",
);

describe("renderMarkdown exact comparison cells", () => {
  it("renders an exact em-dash delta cell for a zero-hz baseline", () => {
    const markdown = renderMarkdown([result]);
    const row = markdown
      .split("\n")
      .find((line) => line.includes("_component definition_"));

    expect(row).toBe(
      "| **`cva`** (static)<br />_component definition_ | 100 ops/s ±0.50% | 0 ops/s ±0.60% | — |",
    );
  });

  it("renders every priority marker in its documented order", () => {
    const markdown = renderMarkdown([result]);
    const markers = [
      "_component call with defaults_",
      "_class join_",
      "_component definition_",
    ];
    const indexes = markers.map((marker) => markdown.indexOf(marker));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });
});
