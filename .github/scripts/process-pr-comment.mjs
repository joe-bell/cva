/**
 * Trusted glue between an untrusted CI artifact and the sticky PR comment.
 * Validates `meta.json`, cross-checks the producing workflow run against the
 * live PR head, then upserts a rendered section via pr-comment.mjs.
 *
 * Extracted from pr-comment.yml so the validation logic is unit-testable;
 * the workflow only downloads artifacts, renders markdown, and invokes this.
 */
import { readFileSync, statSync } from "node:fs";

import { upsertPrComment } from "./pr-comment.mjs";

export const MAX_META_BYTES = 64 * 1024;

/** @typedef {{ number: number }} WorkflowRunPull */

/**
 * @param {unknown} value
 * @returns {number}
 */
export function parseArtifactPrNumber(value) {
  if (!Number.isInteger(value) || value < 1 || value > 1_000_000_000) {
    throw new Error(`invalid PR number in benchmark artifact: ${value}`);
  }
  return value;
}

/**
 * @param {string} metaPath
 * @returns {{ pr: number }}
 */
export function readArtifactMeta(metaPath) {
  if (statSync(metaPath).size > MAX_META_BYTES) {
    throw new Error("benchmark artifact meta.json exceeds the 64 KiB cap");
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  return { pr: parseArtifactPrNumber(meta.pr) };
}

/**
 * @param {number} pr
 * @param {WorkflowRunPull[]} workflowRunPulls
 */
export function assertPrBoundToWorkflowRun(pr, workflowRunPulls) {
  // GitHub omits fork PRs from this array; rely on the head SHA/repo checks
  // when it is empty.
  if (
    workflowRunPulls.length > 0 &&
    !workflowRunPulls.some((pull) => pull.number === pr)
  ) {
    throw new Error(
      `artifact PR #${pr} is not associated with this workflow run`,
    );
  }
}

/**
 * @param {{
 *   pull: { head: { sha: string; repo?: { full_name?: string } | null } };
 *   headSha: string;
 *   headRepo: string;
 *   pr: number;
 * }} input
 * @returns {"mismatch-sha" | "mismatch-repo" | "ok"}
 */
export function checkPullHeadBinding({ pull, headSha, headRepo, pr }) {
  if (pull.head.sha !== headSha) {
    console.log(
      `head SHA mismatch for PR #${pr} (artifact run vs. current head) — skipping, a newer run will comment instead`,
    );
    return "mismatch-sha";
  }
  if (pull.head.repo?.full_name !== headRepo) {
    console.log(
      `head repo mismatch for PR #${pr} (artifact produced by a different fork) — skipping`,
    );
    return "mismatch-repo";
  }
  return "ok";
}

/**
 * Validates an untrusted benchmark artifact and upserts its rendered section.
 *
 * @param {{
 *   github: import("@octokit/rest").Octokit;
 *   context: { repo: { owner: string; repo: string } };
 *   metaPath: string;
 *   sectionContentPath: string;
 *   headSha: string;
 *   headRepo: string;
 *   workflowRunPulls?: WorkflowRunPull[];
 *   sectionId?: string;
 *   createIfMissing?: boolean;
 * }} options
 */
export async function processBenchmarkPrComment({
  github,
  context,
  metaPath,
  sectionContentPath,
  headSha,
  headRepo,
  workflowRunPulls = [],
  sectionId = "benchmark",
  createIfMissing = true,
}) {
  const { pr } = readArtifactMeta(metaPath);
  assertPrBoundToWorkflowRun(pr, workflowRunPulls);

  let pull;
  try {
    ({ data: pull } = await github.rest.pulls.get({
      ...context.repo,
      pull_number: pr,
    }));
  } catch (error) {
    if (error.status === 404) {
      console.log(`PR #${pr} no longer exists — skipping`);
      return { action: "skipped-pr-missing", pr };
    }
    throw error;
  }

  const binding = checkPullHeadBinding({ pull, headSha, headRepo, pr });
  if (binding !== "ok") {
    return { action: binding, pr };
  }

  const sectionContent = readFileSync(sectionContentPath, "utf8");
  const result = await upsertPrComment({
    github,
    context,
    issueNumber: pr,
    sectionId,
    sectionContent,
    createIfMissing,
  });
  return { ...result, pr };
}
