import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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
const tempDirs = [];

function writeArtifactDir({ meta, section = "## Benchmarks\n\ntable" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "cva-process-pr-comment-"));
  tempDirs.push(dir);
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

afterEach(() => {
  for (const dir of tempDirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

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

  function expectedBody(content) {
    return `${STICKY_MARKER}\n\n<!-- cva:section:benchmark:start -->\n${content}\n<!-- cva:section:benchmark:end -->`;
  }

  async function processComment(github, artifact, options = {}) {
    return processBenchmarkPrComment({
      github,
      context,
      ...artifact,
      headSha: "abc123",
      headRepo: "joe-bell/cva",
      workflowRunPulls: [{ number: 42 }],
      ...options,
    });
  }

  function expectNoCommentApiCalls(github) {
    expect(github.paginate).not.toHaveBeenCalled();
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(github.rest.issues.updateComment).not.toHaveBeenCalled();
  }

  it("creates the sticky comment at the bound repository and PR when all checks pass", async () => {
    const artifact = writeArtifactDir({
      section: "## Benchmarks\n\nExact benchmark",
    });
    const github = fakeGithub({ pull });

    await expect(processComment(github, artifact)).resolves.toEqual({
      action: "created",
      commentId: 999,
      pr: 42,
    });

    expect(github.rest.pulls.get).toHaveBeenCalledExactlyOnceWith({
      owner: "joe-bell",
      repo: "cva",
      pull_number: 42,
    });
    expect(github.paginate).toHaveBeenCalledExactlyOnceWith(
      github.rest.issues.listComments,
      { owner: "joe-bell", repo: "cva", issue_number: 42, per_page: 100 },
    );
    expect(github.rest.issues.createComment).toHaveBeenCalledExactlyOnceWith({
      owner: "joe-bell",
      repo: "cva",
      issue_number: 42,
      body: expectedBody("## Benchmarks\n\nExact benchmark"),
    });
    expect(github.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  it("updates the exact existing sticky comment destination", async () => {
    const artifact = writeArtifactDir({ section: "## Exact benchmark" });
    const github = fakeGithub({
      pull,
      comments: [{ id: 654, user: { type: "Bot" }, body: STICKY_MARKER }],
    });

    await expect(processComment(github, artifact)).resolves.toEqual({
      action: "updated",
      commentId: 654,
      pr: 42,
    });

    expect(github.rest.pulls.get).toHaveBeenCalledExactlyOnceWith({
      owner: "joe-bell",
      repo: "cva",
      pull_number: 42,
    });
    expect(github.paginate).toHaveBeenCalledExactlyOnceWith(
      github.rest.issues.listComments,
      { owner: "joe-bell", repo: "cva", issue_number: 42, per_page: 100 },
    );
    expect(github.rest.issues.updateComment).toHaveBeenCalledExactlyOnceWith({
      owner: "joe-bell",
      repo: "cva",
      comment_id: 654,
      body: expectedBody("## Exact benchmark"),
    });
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("rejects an artifact PR not bound to the workflow run without any API call", async () => {
    const github = fakeGithub({ pull });

    await expect(
      processComment(github, writeArtifactDir(), {
        workflowRunPulls: [{ number: 7 }],
      }),
    ).rejects.toThrow(/not associated with this workflow run/);

    expect(github.rest.pulls.get).not.toHaveBeenCalled();
    expectNoCommentApiCalls(github);
  });

  it("skips a stale head SHA without paginating or writing", async () => {
    const github = fakeGithub({ pull });

    await expect(
      processComment(github, writeArtifactDir(), { headSha: "stale-sha" }),
    ).resolves.toEqual({ action: "mismatch-sha", pr: 42 });

    expectNoCommentApiCalls(github);
  });

  it("skips a head repo mismatch without paginating or writing", async () => {
    const github = fakeGithub({ pull });

    await expect(
      processComment(github, writeArtifactDir(), { headRepo: "attacker/cva" }),
    ).resolves.toEqual({ action: "mismatch-repo", pr: 42 });

    expectNoCommentApiCalls(github);
  });

  it("skips a missing PR without paginating or writing", async () => {
    const github = fakeGithub();
    github.rest.pulls.get.mockRejectedValueOnce({ status: 404 });

    await expect(
      processComment(github, writeArtifactDir(), { workflowRunPulls: [] }),
    ).resolves.toEqual({ action: "skipped-pr-missing", pr: 42 });

    expectNoCommentApiCalls(github);
  });

  it("re-throws a non-404 error from the PR lookup", async () => {
    const github = fakeGithub();
    github.rest.pulls.get.mockRejectedValueOnce({ status: 500 });

    await expect(processComment(github, writeArtifactDir())).rejects.toEqual({
      status: 500,
    });

    expectNoCommentApiCalls(github);
  });
});
