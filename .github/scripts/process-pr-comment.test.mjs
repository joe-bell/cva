import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  assertPrBoundToWorkflowRun,
  checkPullHeadBinding,
  MAX_META_BYTES,
  parseArtifactPrNumber,
  processBenchmarkPrComment,
  readArtifactMeta,
} from "./process-pr-comment.mjs";
import { STICKY_MARKER } from "./pr-comment.mjs";

function fakeGithub({ pull, comments = [] } = {}) {
  return {
    paginate: vi.fn(async () => comments),
    rest: {
      pulls: {
        get: vi.fn(async () => ({ data: pull })),
      },
      issues: {
        listComments: vi.fn(),
        updateComment: vi.fn(async () => ({})),
        createComment: vi.fn(async () => ({ data: { id: 999 } })),
      },
    },
  };
}

const context = { repo: { owner: "joe-bell", repo: "cva" } };

function writeArtifactDir({ meta, section = "## Benchmarks\n\ntable" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "cva-process-pr-comment-"));
  writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(meta ?? { pr: 42 }),
  );
  writeFileSync(path.join(dir, "benchmark-section.md"), section);
  return {
    metaPath: path.join(dir, "meta.json"),
    sectionContentPath: path.join(dir, "benchmark-section.md"),
  };
}

describe("parseArtifactPrNumber", () => {
  it("accepts a positive integer PR number", () => {
    expect(parseArtifactPrNumber(42)).toBe(42);
  });

  it("rejects non-integers and out-of-range values", () => {
    expect(() => parseArtifactPrNumber(0)).toThrow(/invalid PR number/);
    expect(() => parseArtifactPrNumber(1.5)).toThrow(/invalid PR number/);
    expect(() => parseArtifactPrNumber("42")).toThrow(/invalid PR number/);
    expect(() => parseArtifactPrNumber(1_000_000_001)).toThrow(
      /invalid PR number/,
    );
  });
});

describe("readArtifactMeta", () => {
  it("parses a well-formed meta.json", () => {
    const { metaPath } = writeArtifactDir({ meta: { pr: 99 } });
    expect(readArtifactMeta(metaPath)).toEqual({ pr: 99 });
  });

  it("rejects meta.json over the size cap", () => {
    const { metaPath } = writeArtifactDir();
    writeFileSync(
      metaPath,
      `{"pr":1,"padding":"${"x".repeat(MAX_META_BYTES)}"}`,
    );
    expect(() => readArtifactMeta(metaPath)).toThrow(/64 KiB cap/);
  });
});

describe("assertPrBoundToWorkflowRun", () => {
  it("passes when the PR is listed on the workflow run", () => {
    expect(() =>
      assertPrBoundToWorkflowRun(42, [{ number: 42 }, { number: 7 }]),
    ).not.toThrow();
  });

  it("passes when workflow_run.pull_requests is empty (fork PRs)", () => {
    expect(() => assertPrBoundToWorkflowRun(42, [])).not.toThrow();
  });

  it("rejects a PR number not associated with the workflow run", () => {
    expect(() => assertPrBoundToWorkflowRun(42, [{ number: 7 }])).toThrow(
      /not associated with this workflow run/,
    );
  });
});

describe("checkPullHeadBinding", () => {
  const pull = {
    head: { sha: "abc123", repo: { full_name: "joe-bell/cva" } },
  };

  it("returns ok when SHA and repo match", () => {
    expect(
      checkPullHeadBinding({
        pull,
        headSha: "abc123",
        headRepo: "joe-bell/cva",
        pr: 42,
      }),
    ).toBe("ok");
  });

  it("returns mismatch-sha when the head moved on", () => {
    expect(
      checkPullHeadBinding({
        pull,
        headSha: "def456",
        headRepo: "joe-bell/cva",
        pr: 42,
      }),
    ).toBe("mismatch-sha");
  });

  it("returns mismatch-repo when a fork mirrored the victim SHA", () => {
    expect(
      checkPullHeadBinding({
        pull,
        headSha: "abc123",
        headRepo: "attacker/cva",
        pr: 42,
      }),
    ).toBe("mismatch-repo");
  });
});

describe("processBenchmarkPrComment", () => {
  const pull = {
    head: { sha: "abc123", repo: { full_name: "joe-bell/cva" } },
  };

  it("creates the sticky comment when all checks pass", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir({
      meta: { pr: 42 },
    });
    const github = fakeGithub({ pull });

    const result = await processBenchmarkPrComment({
      github,
      context,
      metaPath,
      sectionContentPath,
      headSha: "abc123",
      headRepo: "joe-bell/cva",
      workflowRunPulls: [{ number: 42 }],
    });

    expect(result.action).toBe("created");
    expect(github.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = github.rest.issues.createComment.mock.calls[0][0].body;
    expect(body).toContain(STICKY_MARKER);
    expect(body).toContain("## Benchmarks");
  });

  it("skips when the PR no longer exists", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir();
    const github = fakeGithub();
    github.rest.pulls.get.mockRejectedValueOnce({ status: 404 });

    const result = await processBenchmarkPrComment({
      github,
      context,
      metaPath,
      sectionContentPath,
      headSha: "abc123",
      headRepo: "joe-bell/cva",
    });

    expect(result.action).toBe("skipped-pr-missing");
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("re-throws a non-404 error from the PR lookup", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir();
    const github = fakeGithub();
    github.rest.pulls.get.mockRejectedValueOnce({ status: 500 });

    await expect(
      processBenchmarkPrComment({
        github,
        context,
        metaPath,
        sectionContentPath,
        headSha: "abc123",
        headRepo: "joe-bell/cva",
      }),
    ).rejects.toEqual({ status: 500 });
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("skips on head SHA mismatch without throwing", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir();
    const github = fakeGithub({ pull });

    const result = await processBenchmarkPrComment({
      github,
      context,
      metaPath,
      sectionContentPath,
      headSha: "stale-sha",
      headRepo: "joe-bell/cva",
    });

    expect(result.action).toBe("mismatch-sha");
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("skips on head repo mismatch without throwing", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir();
    const github = fakeGithub({ pull });

    const result = await processBenchmarkPrComment({
      github,
      context,
      metaPath,
      sectionContentPath,
      headSha: "abc123",
      headRepo: "attacker/cva",
    });

    expect(result.action).toBe("mismatch-repo");
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("rejects an artifact PR not bound to the workflow run", async () => {
    const { metaPath, sectionContentPath } = writeArtifactDir({
      meta: { pr: 42 },
    });
    const github = fakeGithub({ pull });

    await expect(
      processBenchmarkPrComment({
        github,
        context,
        metaPath,
        sectionContentPath,
        headSha: "abc123",
        headRepo: "joe-bell/cva",
        workflowRunPulls: [{ number: 7 }],
      }),
    ).rejects.toThrow(/not associated with this workflow run/);
  });
});
