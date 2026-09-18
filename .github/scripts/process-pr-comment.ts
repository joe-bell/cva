/**
 * Trusted glue between an untrusted CI artifact and the sticky PR comment.
 * Validates `meta.json`, cross-checks the producing workflow run against the
 * live PR head, then upserts a rendered section via pr-comment.ts.
 *
 * Extracted from pr.yml so the validation logic is unit-testable;
 * the workflow only downloads artifacts, renders markdown, and invokes this.
 */
import { readFileSync, statSync } from "node:fs";

import { type PrCommentGithub, upsertPrComment } from "./pr-comment.ts";

export const MAX_META_BYTES = 64 * 1024;

type WorkflowRunPull = { number: number };
type Pull = {
  head: { sha: string; repo?: { full_name?: string } | null };
};
type ProcessGithub = PrCommentGithub & {
  rest: {
    pulls: {
      get: (params: {
        owner: string;
        repo: string;
        pull_number: number;
      }) => Promise<{ data: Pull }>;
    };
  };
};
type ProcessBenchmarkPrCommentOptions = {
  github: ProcessGithub;
  context: { repo: { owner: string; repo: string } };
  metaPath: string;
  sectionContentPath: string;
  headSha: string;
  headRepo: string;
  workflowRunPulls?: WorkflowRunPull[];
  sectionId?: string;
  createIfMissing?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpError(error: unknown): error is { status: number } {
  return isRecord(error) && typeof error.status === "number";
}

export function parseArtifactPrNumber(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 1_000_000_000
  ) {
    throw new Error(`invalid PR number in benchmark artifact: ${value}`);
  }
  return value;
}

export function readArtifactMeta(metaPath: string): { pr: number } {
  if (statSync(metaPath).size > MAX_META_BYTES) {
    throw new Error("benchmark artifact meta.json exceeds the 64 KiB cap");
  }
  const meta: unknown = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!isRecord(meta)) {
    throw new Error("invalid benchmark artifact metadata");
  }
  return { pr: parseArtifactPrNumber(meta.pr) };
}

export function assertPrBoundToWorkflowRun(
  pr: number,
  workflowRunPulls: WorkflowRunPull[],
) {
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

export function checkPullHeadBinding({
  pull,
  headSha,
  headRepo,
  pr,
}: {
  pull: Pull;
  headSha: string;
  headRepo: string;
  pr: number;
}) {
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
}: ProcessBenchmarkPrCommentOptions) {
  const { pr } = readArtifactMeta(metaPath);
  assertPrBoundToWorkflowRun(pr, workflowRunPulls);

  let pull;
  try {
    ({ data: pull } = await github.rest.pulls.get({
      ...context.repo,
      pull_number: pr,
    }));
  } catch (error) {
    if (isHttpError(error) && error.status === 404) {
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
