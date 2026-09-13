import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

// The shadcn CLI resolves `files[].path` against the repository root of the
// default branch at install time, so a stale path breaks every install.
const root = new URL("../", import.meta.url);
const registry = JSON.parse(
  await readFile(new URL("registry.json", root), "utf8"),
);

describe("registry.json", () => {
  test("declares at least one item", () => {
    expect(registry.items.length).toBeGreaterThan(0);
  });

  test.each(
    registry.items.flatMap((item) =>
      item.files.map((file) => [item.name, file.path]),
    ),
  )("%s: %s exists", (_, path) => {
    expect(existsSync(new URL(path, root))).toBe(true);
  });

  test.each(registry.items.map((item) => [item.name, item]))(
    "%s: universal item files declare a target",
    (_, item) => {
      for (const file of item.files) {
        expect(file.target).toMatch(/^~\//);
      }
    },
  );
});
