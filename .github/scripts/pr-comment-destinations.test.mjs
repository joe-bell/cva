import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { processBenchmarkPrComment } from "./process-pr-comment.mjs";
import { STICKY_MARKER } from "./pr-comment.mjs";

const context = { repo: { owner: "joe-bell", repo: "cva" } };
const pull = {
  head: { sha: "expected-sha", repo: { full_name: "joe-bell/cva" } },
};
const tempDirs = [];

function expectedBody(content) {
  return `${STICKY_MARKER}\n\n<!-- cva:section:benchmark:start -->\n${content}\n<!-- cva:section:benchmark:end -->`;
}

function writeArtifact(pr = 42, content = "## Exact benchmark") {
  const dir = mkdtempSync(path.join(tmpdir(), "cva-pr-comment-destinations-"));
  tempDirs.push(dir);
  const metaPath = path.join(dir, "meta.json");
  const sectionContentPath = path.join(dir, "benchmark-section.md");
  writeFileSync(metaPath, JSON.stringify({ pr }));
  writeFileSync(sectionContentPath, content);
  return { metaPath, sectionContentPath };
}

function fakeGithub({ comments = [], pullResult = pull } = {}) {
  return {
    paginate: vi.fn(async () => comments),
    rest: {
      pulls: { get: vi.fn(async () => ({ data: pullResult })) },
      issues: {
        listComments: vi.fn(),
        createComment: vi.fn(async () => ({ data: { id: 321 } })),
        updateComment: vi.fn(async () => ({})),
      },
    },
  };
}

async function processComment(github, artifact, options = {}) {
  return processBenchmarkPrComment({
    github,
    context,
    ...artifact,
    headSha: "expected-sha",
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

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("processBenchmarkPrComment API destinations", () => {
  it("looks up, paginates, and creates a comment at the bound repository and PR", async () => {
    const artifact = writeArtifact();
    const github = fakeGithub();

    await expect(processComment(github, artifact)).resolves.toEqual({
      action: "created",
      commentId: 321,
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
      body: expectedBody("## Exact benchmark"),
    });
    expect(github.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  it("looks up, paginates, and updates the exact existing comment destination", async () => {
    const artifact = writeArtifact();
    const github = fakeGithub({
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

  it("does not paginate or write when the workflow run is bound to another PR", async () => {
    const github = fakeGithub();

    await expect(
      processComment(github, writeArtifact(), {
        workflowRunPulls: [{ number: 7 }],
      }),
    ).rejects.toThrow("not associated with this workflow run");

    expect(github.rest.pulls.get).not.toHaveBeenCalled();
    expectNoCommentApiCalls(github);
  });

  it("does not paginate or write for a stale head SHA", async () => {
    const github = fakeGithub();

    await expect(
      processComment(github, writeArtifact(), { headSha: "stale-sha" }),
    ).resolves.toEqual({ action: "mismatch-sha", pr: 42 });

    expectNoCommentApiCalls(github);
  });

  it("does not paginate or write for a pull from the wrong repository", async () => {
    const github = fakeGithub();

    await expect(
      processComment(github, writeArtifact(), { headRepo: "fork/cva" }),
    ).resolves.toEqual({ action: "mismatch-repo", pr: 42 });

    expectNoCommentApiCalls(github);
  });

  it("does not paginate or write when the PR lookup reports it is missing", async () => {
    const github = fakeGithub();
    github.rest.pulls.get.mockRejectedValueOnce({ status: 404 });

    await expect(processComment(github, writeArtifact())).resolves.toEqual({
      action: "skipped-pr-missing",
      pr: 42,
    });

    expectNoCommentApiCalls(github);
  });
});
