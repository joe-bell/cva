import { describe, expect, it } from "vitest";
import {
  markdownPathFromEntryId,
  markdownPathsFromRoutePath,
} from "./docs-routes";

describe("docs route helpers", () => {
  it("preserves index entry IDs for mirror assets and canonical routes", () => {
    expect(markdownPathFromEntryId("")).toBe("/index.md");
    expect(markdownPathFromEntryId("index")).toBe("/index.md");
    expect(markdownPathFromEntryId("beta")).toBe("/beta/index.md");
    expect(markdownPathFromEntryId("beta/index.mdx")).toBe("/beta/index.md");
  });

  it("supports slashless, nested-index, and dotted public paths", () => {
    expect(markdownPathsFromRoutePath("/beta")).toEqual([
      "/beta.md",
      "/beta/index.md",
    ]);
    expect(markdownPathsFromRoutePath("/guides/v2.1/")).toEqual([
      "/guides/v2.1.md",
      "/guides/v2.1/index.md",
    ]);
  });
});
