import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const CHECK_NAME = "Workers Builds: cva";
export const CLOUDFLARE_APP_ID = 85455;
export const CLOUDFLARE_APP_SLUG = "cloudflare-workers-and-pages";
export const CHECK_RUNS_PER_PAGE = 100;
export const MAX_CHECK_RUNS = 1000;
export const MAX_API_REQUESTS = 50;
export const REQUEST_TIMEOUT_MS = 5000;
export const GATE_TIMEOUT_MS = 8 * 60 * 1000;
export const POLL_INTERVAL_MS = 15_000;
export const MAX_POLL_ATTEMPTS = 32;
export const WATCH_PATHS_URL = new URL(
  "../cloudflare/docs-watch-paths.json",
  import.meta.url,
);

const SHA = /^[0-9a-f]{40}$/i;
const REPOSITORY_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const TREE_ENTRY =
  /^([0-7]{6}) (blob|commit) ([0-9a-f]{40}(?:[0-9a-f]{24})?)$/i;
const CHECK_STATUSES = new Set([
  "completed",
  "in_progress",
  "pending",
  "queued",
  "requested",
  "waiting",
]);
const CHECK_CONCLUSIONS = new Set([
  "action_required",
  "cancelled",
  "failure",
  "neutral",
  "skipped",
  "stale",
  "success",
  "timed_out",
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function assertSha(value, label) {
  if (typeof value !== "string" || !SHA.test(value)) {
    throw new Error(`${label} must be a 40-character Git SHA.`);
  }
  return value.toLowerCase();
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function assertDate(value, label) {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
  return timestamp;
}

function assertClock(clock) {
  const now = clock();
  if (!Number.isFinite(now)) throw new Error("Clock returned an invalid time.");
  return now;
}

function parsePathList(value, label, allowEmpty) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(
      `${label} must be ${allowEmpty ? "an array" : "a non-empty array"}.`,
    );
  }

  const seen = new Set();
  return value.map((pattern) => {
    if (
      typeof pattern !== "string" ||
      pattern.length === 0 ||
      pattern.startsWith("/") ||
      pattern.includes("\0") ||
      pattern.split("/").includes("..") ||
      seen.has(pattern)
    ) {
      throw new Error(
        `${label} contains an invalid or duplicate path pattern.`,
      );
    }
    seen.add(pattern);
    return pattern;
  });
}

export function parseWatchPaths(value) {
  if (!isRecord(value) || !hasExactKeys(value, ["exclude", "include"])) {
    throw new Error(
      "Cloudflare watch paths must contain only include and exclude.",
    );
  }

  return {
    include: parsePathList(value.include, "include", false),
    exclude: parsePathList(value.exclude, "exclude", true),
  };
}

export async function loadWatchPaths(
  readFileImpl = readFile,
  watchPathsUrl = WATCH_PATHS_URL,
) {
  const source = await readFileImpl(watchPathsUrl, "utf8");
  if (typeof source !== "string") {
    throw new Error("Cloudflare watch paths file did not contain text.");
  }
  return parseWatchPaths(JSON.parse(source));
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function matchesCloudflarePath(pattern, filePath) {
  const expression = pattern.split("*").map(escapeRegExp).join("[\\s\\S]*");
  return new RegExp(`^${expression}$`).test(filePath);
}

export function isWatchedPath(filePath, watchPaths) {
  return (
    !watchPaths.exclude.some((pattern) =>
      matchesCloudflarePath(pattern, filePath),
    ) &&
    watchPaths.include.some((pattern) =>
      matchesCloudflarePath(pattern, filePath),
    )
  );
}

export function parseTreeEntries(output) {
  if (typeof output !== "string") {
    throw new Error("git ls-tree did not return text.");
  }
  if (output.length === 0) return [];
  if (!output.endsWith("\0")) {
    throw new Error("git ls-tree output was not NUL-delimited.");
  }

  return output
    .slice(0, -1)
    .split("\0")
    .map((entry) => {
      const separator = entry.indexOf("\t");
      const header = entry.slice(0, separator);
      const filePath = entry.slice(separator + 1);
      const match = TREE_ENTRY.exec(header);

      if (
        separator === -1 ||
        !match ||
        filePath.length === 0 ||
        filePath.startsWith("/")
      ) {
        throw new Error("git ls-tree returned an invalid tree entry.");
      }

      return {
        mode: match[1],
        type: match[2],
        object: match[3].toLowerCase(),
        path: filePath,
      };
    });
}

async function executeGit(args, execImpl = execFileAsync) {
  const result = await execImpl("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!isRecord(result) || typeof result.stdout !== "string") {
    throw new Error("git did not return text output.");
  }
  return result.stdout;
}

export async function watchedTreeFingerprint(
  sha,
  watchPaths,
  execImpl = execFileAsync,
) {
  const commit = assertSha(sha, "Tree SHA");
  const output = await executeGit(
    ["ls-tree", "--full-tree", "-r", "-z", commit],
    execImpl,
  );

  return parseTreeEntries(output)
    .filter((entry) => isWatchedPath(entry.path, watchPaths))
    .map(
      (entry) => `${entry.mode} ${entry.type} ${entry.object}\t${entry.path}\0`,
    )
    .sort()
    .join("");
}

function parseShaLines(output, label, allowEmpty = false) {
  const values = output.trim() === "" ? [] : output.trim().split("\n");
  if (
    (!allowEmpty && values.length === 0) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${label} did not return unique commit SHAs.`);
  }
  return values.map((value) => assertSha(value, label));
}

export async function findMergeBase(
  baseSha,
  headSha,
  execImpl = execFileAsync,
) {
  const base = assertSha(baseSha, "Base SHA");
  const head = assertSha(headSha, "Head SHA");
  const output = await executeGit(
    ["merge-base", "--all", base, head],
    execImpl,
  );
  const mergeBases = parseShaLines(output, "git merge-base");

  if (mergeBases.length !== 1) {
    throw new Error(
      "Expected one merge base for the pull request head and base.",
    );
  }
  return mergeBases[0];
}

export async function findCandidateShas({
  headSha,
  mergeBaseSha,
  headFingerprint,
  watchPaths,
  execImpl = execFileAsync,
}) {
  const head = assertSha(headSha, "Head SHA");
  const mergeBase = assertSha(mergeBaseSha, "Merge-base SHA");
  const output = await executeGit(
    ["rev-list", "--topo-order", "--ancestry-path", `${mergeBase}..${head}`],
    execImpl,
  );
  const ancestors = parseShaLines(output, "git rev-list", true);

  if (head !== mergeBase && ancestors[0] !== head) {
    throw new Error("git rev-list did not start with the pull request head.");
  }

  const candidates = [];
  for (const sha of [...ancestors, mergeBase]) {
    const fingerprint =
      sha === head
        ? headFingerprint
        : await watchedTreeFingerprint(sha, watchPaths, execImpl);
    if (fingerprint === headFingerprint) candidates.push(sha);
  }
  return candidates;
}

export function parseRepository(value) {
  if (typeof value !== "string") {
    throw new Error("Repository must be an owner/name pair.");
  }
  const parts = value.split("/");
  if (
    parts.length !== 2 ||
    !REPOSITORY_SEGMENT.test(parts[0]) ||
    !REPOSITORY_SEGMENT.test(parts[1])
  ) {
    throw new Error("Repository must be an owner/name pair.");
  }
  return { owner: parts[0], repo: parts[1] };
}

export function checkRunsUrl(repository, sha, page) {
  const { owner, repo } = parseRepository(repository);
  const candidate = assertSha(sha, "Check-run SHA");
  const pageNumber = assertPositiveInteger(page, "Check-run page");
  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${candidate}/check-runs`,
  );
  url.search = new URLSearchParams({
    app_id: String(CLOUDFLARE_APP_ID),
    check_name: CHECK_NAME,
    filter: "latest",
    page: String(pageNumber),
    per_page: String(CHECK_RUNS_PER_PAGE),
  }).toString();
  return url;
}

export function createRequestBudget(maxRequests = MAX_API_REQUESTS) {
  const maximum = assertPositiveInteger(maxRequests, "Maximum API requests");
  let used = 0;

  return {
    consume() {
      if (used >= maximum) {
        throw new Error(
          `Cloudflare gate exceeded its ${maximum}-request API limit.`,
        );
      }
      used += 1;
    },
    get used() {
      return used;
    },
  };
}

export async function fetchGitHubJson(
  url,
  {
    fetchImpl = globalThis.fetch,
    requestBudget = createRequestBudget(),
    requestTimeoutMs = REQUEST_TIMEOUT_MS,
    token,
  } = {},
) {
  if (!(url instanceof URL) || url.origin !== "https://api.github.com") {
    throw new Error(
      "GitHub check-run requests must use the GitHub API origin.",
    );
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new Error(
      "A GitHub token is required to read Cloudflare check runs.",
    );
  }
  const timeoutMs = assertPositiveInteger(requestTimeoutMs, "Request timeout");
  if (!isRecord(requestBudget) || typeof requestBudget.consume !== "function") {
    throw new Error("Cloudflare gate requires an API request budget.");
  }

  requestBudget.consume();
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(
        new Error(`GitHub check-run request timed out after ${timeoutMs}ms.`),
      );
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!isRecord(response) || typeof response.ok !== "boolean") {
      throw new Error("GitHub check-run request returned an invalid response.");
    }
    if (!response.ok) {
      const status = Number.isSafeInteger(response.status)
        ? response.status
        : "an invalid status";
      throw new Error(`GitHub check-run request failed with HTTP ${status}.`);
    }
    if (typeof response.json !== "function") {
      throw new Error("GitHub check-run response did not include JSON.");
    }
    return await Promise.race([response.json(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseCheckRunsPage(value) {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.total_count) ||
    value.total_count < 0 ||
    !Array.isArray(value.check_runs) ||
    value.check_runs.length > CHECK_RUNS_PER_PAGE
  ) {
    throw new Error("GitHub returned a malformed check-runs page.");
  }
  return value;
}

function requestTimeoutForDeadline(requestTimeoutMs, deadline, clock, sha) {
  if (deadline === undefined) return requestTimeoutMs;

  const remaining = deadline - assertClock(clock);
  if (remaining <= 0) {
    throw timeoutError(sha);
  }
  return Math.min(requestTimeoutMs, Math.ceil(remaining));
}

export async function listCloudflareCheckRuns({
  repository,
  sha,
  token,
  fetchImpl = globalThis.fetch,
  requestBudget = createRequestBudget(),
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  deadline,
  clock = Date.now,
}) {
  const candidate = assertSha(sha, "Check-run SHA");
  const requestPage = async (page) =>
    parseCheckRunsPage(
      await fetchGitHubJson(checkRunsUrl(repository, candidate, page), {
        fetchImpl,
        requestBudget,
        requestTimeoutMs: requestTimeoutForDeadline(
          requestTimeoutMs,
          deadline,
          clock,
          candidate,
        ),
        token,
      }),
    );

  const firstPage = await requestPage(1);
  if (firstPage.total_count > MAX_CHECK_RUNS) {
    throw new Error("GitHub check-runs response may be truncated.");
  }

  const pageCount = Math.ceil(firstPage.total_count / CHECK_RUNS_PER_PAGE);
  const checkRuns = [...firstPage.check_runs];
  for (let page = 2; page <= pageCount; page++) {
    const nextPage = await requestPage(page);
    if (
      nextPage.total_count !== firstPage.total_count ||
      nextPage.check_runs.length === 0
    ) {
      throw new Error(
        "GitHub returned an incomplete check-runs page sequence.",
      );
    }
    checkRuns.push(...nextPage.check_runs);
  }

  if (checkRuns.length !== firstPage.total_count) {
    throw new Error("GitHub returned an incomplete check-runs response.");
  }
  return checkRuns;
}

function parseAuthoritativeCheckRun(value, candidateSha) {
  if (!isRecord(value) || typeof value.name !== "string") {
    throw new Error("GitHub returned a malformed check run.");
  }
  if (value.name !== CHECK_NAME) return undefined;
  if (!isRecord(value.app)) {
    throw new Error("Cloudflare check run did not identify its GitHub App.");
  }
  if (
    value.app.id !== CLOUDFLARE_APP_ID ||
    value.app.slug !== CLOUDFLARE_APP_SLUG
  ) {
    return undefined;
  }
  const headSha = assertSha(value.head_sha, "Cloudflare check-run head SHA");
  if (headSha !== candidateSha) return undefined;

  const id = assertPositiveInteger(value.id, "Cloudflare check-run ID");
  if (value.started_at !== null) {
    assertDate(value.started_at, "Cloudflare check-run start");
  }
  if (typeof value.status !== "string" || !CHECK_STATUSES.has(value.status)) {
    throw new Error("Cloudflare check run had an invalid status.");
  }

  if (value.status === "completed") {
    if (
      typeof value.conclusion !== "string" ||
      !CHECK_CONCLUSIONS.has(value.conclusion)
    ) {
      throw new Error(
        "Completed Cloudflare check run had an invalid conclusion.",
      );
    }
    assertDate(value.completed_at, "Cloudflare check-run completion");
  } else if (value.conclusion !== null && value.conclusion !== undefined) {
    throw new Error(
      "Pending Cloudflare check run had an unexpected conclusion.",
    );
  }

  return {
    id,
    status: value.status,
    conclusion: value.conclusion,
  };
}

export function selectLatestCloudflareCheck(checkRuns, sha) {
  if (!Array.isArray(checkRuns)) {
    throw new Error("Cloudflare check runs must be an array.");
  }
  const candidate = assertSha(sha, "Check-run SHA");
  const authoritative = checkRuns
    .map((checkRun) => parseAuthoritativeCheckRun(checkRun, candidate))
    .filter((checkRun) => checkRun !== undefined);

  authoritative.sort((left, right) => right.id - left.id);
  return authoritative[0];
}

export async function latestCloudflareCheck({
  repository,
  sha,
  token,
  fetchImpl,
  requestBudget,
  requestTimeoutMs,
  deadline,
  clock,
}) {
  const checkRuns = await listCloudflareCheckRuns({
    repository,
    sha,
    token,
    fetchImpl,
    requestBudget,
    requestTimeoutMs,
    deadline,
    clock,
  });
  return selectLatestCloudflareCheck(checkRuns, sha);
}

export function cloudflareCheckOutcome(checkRun) {
  if (checkRun.status !== "completed") return "pending";
  return checkRun.conclusion === "success" ? "success" : "failure";
}

function timeoutError(candidateSha) {
  return new Error(
    `Timed out waiting for ${CHECK_NAME} from ${CLOUDFLARE_APP_SLUG} on ${candidateSha}. Rerun this check after Cloudflare reports the build.`,
  );
}

export async function waitForCloudflareCheck({
  candidateSha,
  initialCheck,
  lookupCheck,
  deadline,
  clock = Date.now,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  pollIntervalMs = POLL_INTERVAL_MS,
  maxPollAttempts = MAX_POLL_ATTEMPTS,
}) {
  const candidate = assertSha(candidateSha, "Candidate SHA");
  const interval = assertPositiveInteger(pollIntervalMs, "Poll interval");
  const maximum = assertPositiveInteger(
    maxPollAttempts,
    "Maximum poll attempts",
  );
  if (typeof lookupCheck !== "function") {
    throw new Error("Cloudflare gate requires a check-run lookup function.");
  }
  if (!Number.isFinite(deadline)) {
    throw new Error("Cloudflare gate deadline must be a finite timestamp.");
  }

  let checkRun = initialCheck;
  let attempts = 0;
  while (true) {
    const remaining = deadline - assertClock(clock);
    if (remaining <= 0) throw timeoutError(candidate);

    if (checkRun) {
      const outcome = cloudflareCheckOutcome(checkRun);
      if (outcome === "success") return { candidateSha: candidate, checkRun };
      if (outcome === "failure") {
        throw new Error(
          `${CHECK_NAME} failed on ${candidate}; refusing to use an older result.`,
        );
      }
    }

    if (attempts >= maximum) {
      throw new Error(
        `Cloudflare gate exceeded its ${maximum}-poll wait limit.`,
      );
    }

    await sleepImpl(Math.min(interval, remaining));
    attempts += 1;
    checkRun = await lookupCheck();
  }
}

export async function verifyCloudflareBuild({
  baseSha,
  headSha,
  repository,
  token,
  watchPaths,
  execImpl = execFileAsync,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  clock = Date.now,
  sleepImpl,
  gateTimeoutMs = GATE_TIMEOUT_MS,
  pollIntervalMs = POLL_INTERVAL_MS,
  maxPollAttempts = MAX_POLL_ATTEMPTS,
  maxApiRequests = MAX_API_REQUESTS,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const base = assertSha(baseSha, "Base SHA");
  const head = assertSha(headSha, "Head SHA");
  parseRepository(repository);
  const timeoutMs = assertPositiveInteger(gateTimeoutMs, "Gate timeout");
  const deadline = assertClock(clock) + timeoutMs;
  const configuredWatchPaths =
    watchPaths === undefined
      ? await loadWatchPaths(readFileImpl)
      : parseWatchPaths(watchPaths);

  const mergeBase = await findMergeBase(base, head, execImpl);
  const mergeBaseFingerprint = await watchedTreeFingerprint(
    mergeBase,
    configuredWatchPaths,
    execImpl,
  );
  const headFingerprint = await watchedTreeFingerprint(
    head,
    configuredWatchPaths,
    execImpl,
  );
  if (mergeBaseFingerprint === headFingerprint) {
    return { candidateSha: head, state: "unchanged" };
  }

  const candidates = await findCandidateShas({
    headSha: head,
    mergeBaseSha: mergeBase,
    headFingerprint,
    watchPaths: configuredWatchPaths,
    execImpl,
  });

  const requestBudget = createRequestBudget(maxApiRequests);
  const lookup = (candidateSha) =>
    latestCloudflareCheck({
      repository,
      sha: candidateSha,
      token,
      fetchImpl,
      requestBudget,
      requestTimeoutMs,
      deadline,
      clock,
    });

  for (const candidate of candidates) {
    const checkRun = await lookup(candidate);
    if (checkRun) {
      return waitForCloudflareCheck({
        candidateSha: candidate,
        initialCheck: checkRun,
        lookupCheck: () => lookup(candidate),
        deadline,
        clock,
        sleepImpl,
        pollIntervalMs,
        maxPollAttempts,
      });
    }
  }

  return waitForCloudflareCheck({
    candidateSha: head,
    initialCheck: undefined,
    lookupCheck: () => lookup(head),
    deadline,
    clock,
    sleepImpl,
    pollIntervalMs,
    maxPollAttempts,
  });
}

export function readGateEnvironment(environment = process.env) {
  return {
    baseSha: environment.BASE_SHA,
    headSha: environment.HEAD_SHA,
    repository: environment.REPOSITORY,
    token: environment.GITHUB_TOKEN,
  };
}

export async function main(environment = process.env, dependencies = {}) {
  const result = await verifyCloudflareBuild({
    ...readGateEnvironment(environment),
    ...dependencies,
  });
  console.log(
    result.state === "unchanged"
      ? `Cloudflare gate passed: watched files match the merge base; no Cloudflare check is needed for ${result.candidateSha}.`
      : `Cloudflare gate passed with ${CHECK_NAME} for ${result.candidateSha}.`,
  );
  return result;
}

/* v8 ignore start -- process entrypoint, exercised by the workflow; subprocess coverage is not collected. */
function isMainModule() {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
/* v8 ignore stop */
