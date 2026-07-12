import { describe, expect, it, vi } from "vitest";

import {
  assertCommentBodySize,
  findStickyComment,
  MAX_COMMENT_CHARS,
  sectionBlock,
  STICKY_MARKER,
  upsertPrComment,
  upsertSection,
} from "./pr-comment.mjs";

function fakeGithub(comments) {
  return {
    paginate: vi.fn(async () => comments),
    rest: {
      issues: {
        listComments: vi.fn(),
        updateComment: vi.fn(async () => ({})),
        createComment: vi.fn(async () => ({ data: { id: 999 } })),
      },
    },
  };
}

const context = { repo: { owner: "joe-bell", repo: "cva" } };

describe("sectionBlock", () => {
  it("wraps trimmed content in this section's markers", () => {
    const block = sectionBlock("benchmark", "  ## Benchmarks\n\nsome text  ");
    expect(block).toBe(
      "<!-- cva:section:benchmark:start -->\n## Benchmarks\n\nsome text\n<!-- cva:section:benchmark:end -->",
    );
  });
});

describe("upsertSection", () => {
  it("appends a new section to a body that only has the sticky marker", () => {
    const result = upsertSection(STICKY_MARKER, "benchmark", "content A");
    expect(result).toBe(
      `${STICKY_MARKER}\n\n<!-- cva:section:benchmark:start -->\ncontent A\n<!-- cva:section:benchmark:end -->`,
    );
  });

  it("appends a second section alongside an existing one", () => {
    const withFirst = upsertSection(STICKY_MARKER, "benchmark", "content A");
    const withBoth = upsertSection(withFirst, "coverage", "content B");
    expect(withBoth).toContain("cva:section:benchmark:start");
    expect(withBoth).toContain("cva:section:coverage:start");
    expect(withBoth).toContain("content A");
    expect(withBoth).toContain("content B");
  });

  it("replaces an existing section in place without duplicating it", () => {
    const withFirst = upsertSection(STICKY_MARKER, "benchmark", "old content");
    const updated = upsertSection(withFirst, "benchmark", "new content");
    expect(updated).not.toContain("old content");
    expect(updated).toContain("new content");
    expect(updated.match(/cva:section:benchmark:start/g)).toHaveLength(1);
  });

  it("only touches the named section, leaving other sections untouched", () => {
    const withBoth = upsertSection(
      upsertSection(STICKY_MARKER, "benchmark", "bench content"),
      "coverage",
      "coverage content",
    );
    const updated = upsertSection(withBoth, "benchmark", "updated bench");
    expect(updated).toContain("coverage content");
    expect(updated).toContain("updated bench");
    expect(updated).not.toContain("bench content");
  });

  it("renders sections in canonical order regardless of insertion order", () => {
    const order = ["benchmark", "coverage"];
    const coverageFirst = upsertSection(
      STICKY_MARKER,
      "coverage",
      "coverage content",
      order,
    );
    const both = upsertSection(
      coverageFirst,
      "benchmark",
      "bench content",
      order,
    );
    expect(both.indexOf("cva:section:benchmark:start")).toBeLessThan(
      both.indexOf("cva:section:coverage:start"),
    );
  });

  it("reordering the order list reorders the body on the next update", () => {
    const both = upsertSection(
      upsertSection(STICKY_MARKER, "benchmark", "bench content", [
        "benchmark",
        "coverage",
      ]),
      "coverage",
      "coverage content",
      ["benchmark", "coverage"],
    );
    const reordered = upsertSection(both, "coverage", "coverage content", [
      "coverage",
      "benchmark",
    ]);
    expect(reordered.indexOf("cva:section:coverage:start")).toBeLessThan(
      reordered.indexOf("cva:section:benchmark:start"),
    );
    expect(reordered).toContain("bench content");
  });

  it("keeps a section whose id is absent from the order list, after listed ones", () => {
    const order = ["benchmark"];
    const withUnknown = upsertSection(
      upsertSection(STICKY_MARKER, "extras", "extra content", order),
      "benchmark",
      "bench content",
      order,
    );
    expect(withUnknown).toContain("extra content");
    expect(withUnknown.indexOf("cva:section:benchmark:start")).toBeLessThan(
      withUnknown.indexOf("cva:section:extras:start"),
    );
  });

  it("rejects section ids that could break the marker format", () => {
    expect(() => upsertSection(STICKY_MARKER, "Bad Id", "x")).toThrow(
      /invalid section id/,
    );
    expect(() => upsertSection(STICKY_MARKER, "x --><script>", "x")).toThrow(
      /invalid section id/,
    );
    expect(() => sectionBlock("UPPER", "x")).toThrow(/invalid section id/);
  });

  it("rejects content containing a literal section marker", () => {
    const smuggled = "before\n<!-- cva:section:benchmark:end -->\nafter";
    expect(() => sectionBlock("coverage", smuggled)).toThrow(
      /literal section marker/,
    );
    expect(() => upsertSection(STICKY_MARKER, "coverage", smuggled)).toThrow(
      /literal section marker/,
    );
  });
});

describe("findStickyComment", () => {
  it("returns the bot comment starting with the sticky marker", async () => {
    const github = fakeGithub([
      { id: 1, user: { type: "User" }, body: "unrelated comment" },
      { id: 2, user: { type: "Bot" }, body: `${STICKY_MARKER}\nhi` },
    ]);
    const found = await findStickyComment({
      github,
      context,
      issueNumber: 42,
    });
    expect(found?.id).toBe(2);
  });

  it("ignores a non-bot comment that happens to start with the marker", async () => {
    const github = fakeGithub([
      { id: 1, user: { type: "User" }, body: `${STICKY_MARKER}\nspoofed` },
    ]);
    const found = await findStickyComment({
      github,
      context,
      issueNumber: 42,
    });
    expect(found).toBeUndefined();
  });

  it("retries until the comment appears, without sleeping past the first success", async () => {
    let calls = 0;
    const github = {
      paginate: vi.fn(async () => {
        calls += 1;
        return calls < 3
          ? []
          : [{ id: 7, user: { type: "Bot" }, body: STICKY_MARKER }];
      }),
      rest: { issues: { listComments: vi.fn() } },
    };
    const found = await findStickyComment({
      github,
      context,
      issueNumber: 42,
      retries: 5,
      retryDelayMs: 1,
    });
    expect(found?.id).toBe(7);
    expect(calls).toBe(3);
  });

  it("gives up and returns undefined after exhausting retries", async () => {
    const github = fakeGithub([]);
    const found = await findStickyComment({
      github,
      context,
      issueNumber: 42,
      retries: 1,
      retryDelayMs: 1,
    });
    expect(found).toBeUndefined();
  });
});

describe("assertCommentBodySize", () => {
  it("accepts a body within GitHub's limit", () => {
    const body = "x".repeat(MAX_COMMENT_CHARS);
    expect(assertCommentBodySize(body)).toBe(body);
  });

  it("rejects a body over GitHub's limit", () => {
    expect(() =>
      assertCommentBodySize("x".repeat(MAX_COMMENT_CHARS + 1)),
    ).toThrow(/exceeds GitHub's 65536-character limit/);
  });
});

describe("upsertPrComment", () => {
  it("creates the comment when missing and createIfMissing is true", async () => {
    const github = fakeGithub([]);
    const result = await upsertPrComment({
      github,
      context,
      issueNumber: 42,
      sectionId: "benchmark",
      sectionContent: "## Benchmarks",
      createIfMissing: true,
    });
    expect(result.action).toBe("created");
    expect(github.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = github.rest.issues.createComment.mock.calls[0][0].body;
    expect(body).toContain(STICKY_MARKER);
    expect(body).toContain("## Benchmarks");
  });

  it("skips without creating when missing and createIfMissing is false", async () => {
    const github = fakeGithub([]);
    const result = await upsertPrComment({
      github,
      context,
      issueNumber: 42,
      sectionId: "coverage",
      sectionContent: "## Coverage",
      createIfMissing: false,
      retries: 0,
    });
    expect(result.action).toBe("skipped-no-comment");
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("updates the existing comment, preserving other sections", async () => {
    const existingBody = upsertSection(
      STICKY_MARKER,
      "benchmark",
      "old benchmark content",
    );
    const github = fakeGithub([
      { id: 5, user: { type: "Bot" }, body: existingBody },
    ]);
    const result = await upsertPrComment({
      github,
      context,
      issueNumber: 42,
      sectionId: "coverage",
      sectionContent: "## Coverage",
      createIfMissing: false,
    });
    expect(result.action).toBe("updated");
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    const body = github.rest.issues.updateComment.mock.calls[0][0].body;
    expect(body).toContain("old benchmark content");
    expect(body).toContain("## Coverage");
  });

  it("rejects a rendered comment body over GitHub's limit", async () => {
    const github = fakeGithub([]);
    await expect(
      upsertPrComment({
        github,
        context,
        issueNumber: 42,
        sectionId: "benchmark",
        sectionContent: "x".repeat(MAX_COMMENT_CHARS),
        createIfMissing: true,
      }),
    ).rejects.toThrow(/exceeds GitHub's 65536-character limit/);
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });
});
