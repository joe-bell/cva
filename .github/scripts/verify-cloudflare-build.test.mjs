import { describe, expect, it } from "vitest";

import {
  CHECK_NAME,
  CHECK_RUNS_PER_PAGE,
  CLOUDFLARE_APP_ID,
  CLOUDFLARE_APP_SLUG,
  MAX_CHECK_RUNS,
  checkRunsUrl,
  cloudflareCheckOutcome,
  createRequestBudget,
  fetchGitHubJson,
  findCandidateShas,
  findMergeBase,
  isWatchedPath,
  listCloudflareCheckRuns,
  loadWatchPaths,
  main,
  matchesCloudflarePath,
  parseCheckRunsPage,
  parseRepository,
  parseTreeEntries,
  parseWatchPaths,
  readGateEnvironment,
  selectLatestCloudflareCheck,
  verifyCloudflareBuild,
  waitForCloudflareCheck,
  watchedTreeFingerprint,
} from "./verify-cloudflare-build.mjs";

const SHAS = {
  base: "a".repeat(40),
  head: "b".repeat(40),
  merge: "c".repeat(40),
  middle: "d".repeat(40),
  previous: "e".repeat(40),
  side: "f".repeat(40),
};

const WATCH_PATHS = {
  include: ["docs/*", ".node-version"],
  exclude: ["docs/private/*"],
};

function tree(entries) {
  return entries
    .map(
      ({ mode = "100644", type = "blob", object = "1".repeat(40), path }) =>
        `${mode} ${type} ${object}\t${path}\0`,
    )
    .join("");
}

function gitFixture({ trees, mergeBase = SHAS.merge, ancestors = [] }) {
  const calls = [];
  const execImpl = async (_command, args) => {
    calls.push(args);
    if (args[0] === "ls-tree") {
      return { stdout: trees[args.at(-1)] ?? "" };
    }
    if (args[0] === "merge-base") return { stdout: `${mergeBase}\n` };
    if (args[0] === "rev-list") return { stdout: ancestors.join("\n") };
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };
  return { calls, execImpl };
}

function checkRun(overrides = {}) {
  return {
    app: { id: CLOUDFLARE_APP_ID, slug: CLOUDFLARE_APP_SLUG },
    completed_at: "2026-09-17T12:01:00.000Z",
    conclusion: "success",
    head_sha: SHAS.head,
    id: 1,
    name: CHECK_NAME,
    started_at: "2026-09-17T12:00:00.000Z",
    status: "completed",
    ...overrides,
  };
}

function checkPage(checkRuns, totalCount = checkRuns.length) {
  return { check_runs: checkRuns, total_count: totalCount };
}

function response(data, { ok = true, status = 200 } = {}) {
  return { json: async () => data, ok, status };
}

function fetchFixture(pages) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ options, url: new URL(url) });
    const page = pages.shift();
    if (page instanceof Error) throw page;
    return response(page ?? checkPage([]));
  };
  return { calls, fetchImpl };
}

describe("watch paths", () => {
  it("matches Cloudflare wildcards across directories and applies excludes first", () => {
    expect(matchesCloudflarePath("docs/*", "docs/nested/file.mdx")).toBe(true);
    expect(matchesCloudflarePath("*.md", "docs/README.md")).toBe(true);
    expect(matchesCloudflarePath("*.md", "docs/README.mdx")).toBe(false);
    expect(matchesCloudflarePath(".node-version", ".node-version")).toBe(true);
    expect(isWatchedPath("docs/page.mdx", WATCH_PATHS)).toBe(true);
    expect(isWatchedPath("docs/private/notes.mdx", WATCH_PATHS)).toBe(false);
    expect(isWatchedPath("packages/cva/src/index.ts", WATCH_PATHS)).toBe(false);
  });

  it("validates the committed payload shape", async () => {
    await expect(loadWatchPaths()).resolves.toEqual({
      exclude: [],
      include: [
        "docs/*",
        "packages/cva/*",
        "packages/class-variance-authority/*",
        ".config/*",
        ".github/cloudflare/*",
        ".github/repository-settings/*",
        ".github/rulesets/*",
        ".github/scripts/verify-cloudflare-build.mjs",
        ".github/workflows/ci.yml",
        ".github/workflows/cloudflare-build.yml",
        "package.json",
        "tsconfig.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        ".prettierrc.json",
        ".node-version",
        ".nvmrc",
      ],
    });
    await expect(
      loadWatchPaths(async () => JSON.stringify(WATCH_PATHS)),
    ).resolves.toEqual(WATCH_PATHS);
    expect(() => parseWatchPaths({ include: [], exclude: [] })).toThrow(
      /non-empty/,
    );
    expect(() =>
      parseWatchPaths({ include: ["docs/*", "docs/*"], exclude: [] }),
    ).toThrow(/duplicate/);
    expect(() =>
      parseWatchPaths({ include: ["../docs/*"], exclude: [] }),
    ).toThrow(/invalid/);
    expect(() =>
      parseWatchPaths({ include: ["docs/*"], exclude: [], extra: true }),
    ).toThrow(/only include and exclude/);
    expect(() => parseWatchPaths(null)).toThrow(/only include and exclude/);
    for (const include of [
      [1],
      [""],
      ["/docs/*"],
      ["docs/\0"],
      ["docs/../*"],
    ]) {
      expect(() => parseWatchPaths({ include, exclude: [] })).toThrow(
        /invalid/,
      );
    }
    expect(() => parseWatchPaths({ include: ["docs/*"], exclude: "" })).toThrow(
      /array/,
    );
    await expect(loadWatchPaths(async () => Buffer.from("{}"))).rejects.toThrow(
      /did not contain text/,
    );
  });
});

describe("watched tree fingerprints", () => {
  it("includes paths, modes, object IDs, and symlink targets", async () => {
    const git = gitFixture({
      trees: {
        [SHAS.base]: tree([
          { object: "1".repeat(40), path: "docs/old.mdx" },
          { object: "2".repeat(40), path: "docs/link", mode: "120000" },
        ]),
        [SHAS.head]: tree([
          { object: "1".repeat(40), path: "docs/new.mdx" },
          { object: "3".repeat(40), path: "docs/link", mode: "120000" },
        ]),
        [SHAS.middle]: tree([
          { object: "1".repeat(40), path: "docs/new.mdx", mode: "100755" },
          { object: "3".repeat(40), path: "docs/link", mode: "120000" },
        ]),
      },
    });

    const base = await watchedTreeFingerprint(
      SHAS.base,
      WATCH_PATHS,
      git.execImpl,
    );
    const head = await watchedTreeFingerprint(
      SHAS.head,
      WATCH_PATHS,
      git.execImpl,
    );
    const changedMode = await watchedTreeFingerprint(
      SHAS.middle,
      WATCH_PATHS,
      git.execImpl,
    );

    expect(base).not.toBe(head);
    expect(head).not.toBe(changedMode);
    expect(git.calls[0]).toEqual([
      "ls-tree",
      "--full-tree",
      "-r",
      "-z",
      SHAS.base,
    ]);
  });

  it("rejects malformed NUL-delimited git output", () => {
    expect(parseTreeEntries("")).toEqual([]);
    expect(() => parseTreeEntries(null)).toThrow(/did not return text/);
    expect(() => parseTreeEntries("100644 blob abc\tdocs/page.mdx")).toThrow(
      /NUL-delimited/,
    );
    expect(() => parseTreeEntries("100644 blob abc\0")).toThrow(
      /invalid tree entry/,
    );
    expect(() => parseTreeEntries("100644 blob nope\tdocs/page.mdx\0")).toThrow(
      /invalid tree entry/,
    );
  });

  it("fails closed when git does not return a tree", async () => {
    await expect(
      watchedTreeFingerprint(SHAS.head, WATCH_PATHS, async () => ({})),
    ).rejects.toThrow(/git did not return text output/);
  });
});

describe("git ancestry", () => {
  it("considers matching ancestors through a supplied merge base", async () => {
    const current = tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      ancestors: [SHAS.head, SHAS.middle, SHAS.previous],
      trees: {
        [SHAS.base]: tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]),
        [SHAS.head]: current,
        [SHAS.merge]: current,
        [SHAS.middle]: tree([
          { object: "3".repeat(40), path: "docs/page.mdx" },
        ]),
        [SHAS.previous]: current,
      },
    });
    const headFingerprint = await watchedTreeFingerprint(
      SHAS.head,
      WATCH_PATHS,
      git.execImpl,
    );

    await expect(
      findCandidateShas({
        headSha: SHAS.head,
        mergeBaseSha: SHAS.merge,
        headFingerprint,
        watchPaths: WATCH_PATHS,
        execImpl: git.execImpl,
      }),
    ).resolves.toEqual([SHAS.head, SHAS.previous, SHAS.merge]);
  });

  it("fails closed for multiple merge bases or an incomplete ancestry walk", async () => {
    const multiple = gitFixture({
      mergeBase: `${SHAS.merge}\n${SHAS.middle}`,
      trees: {},
    });
    await expect(
      findMergeBase(SHAS.base, SHAS.head, multiple.execImpl),
    ).rejects.toThrow(/one merge base/);

    const current = tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]);
    const unordered = gitFixture({
      ancestors: [SHAS.previous, SHAS.head],
      trees: {
        [SHAS.base]: tree([]),
        [SHAS.head]: current,
        [SHAS.merge]: tree([]),
        [SHAS.previous]: current,
      },
    });
    await expect(
      findCandidateShas({
        headSha: SHAS.head,
        mergeBaseSha: SHAS.merge,
        headFingerprint: current,
        watchPaths: WATCH_PATHS,
        execImpl: unordered.execImpl,
      }),
    ).rejects.toThrow(/did not start/);
  });

  it("rejects invalid git revisions and allows an empty head-to-merge walk", async () => {
    await expect(
      findMergeBase(SHAS.base, SHAS.head, async () => ({ stdout: "" })),
    ).rejects.toThrow(/unique commit SHAs/);
    await expect(
      findMergeBase(SHAS.base, SHAS.head, async () => ({ stdout: "invalid" })),
    ).rejects.toThrow(/40-character Git SHA/);
    await expect(
      findMergeBase(SHAS.base, SHAS.head, async () => ({ stdout: null })),
    ).rejects.toThrow(/did not return text/);

    const current = tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      ancestors: [],
      mergeBase: SHAS.head,
      trees: { [SHAS.head]: current },
    });
    await expect(
      findCandidateShas({
        headSha: SHAS.head,
        mergeBaseSha: SHAS.head,
        headFingerprint: current,
        watchPaths: WATCH_PATHS,
        execImpl: git.execImpl,
      }),
    ).resolves.toEqual([SHAS.head]);
  });

  it("skips ancestors whose watched tree differs from the head", async () => {
    const current = tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      ancestors: [SHAS.head, SHAS.middle],
      trees: {
        [SHAS.head]: current,
        [SHAS.merge]: tree([{ object: "3".repeat(40), path: "docs/page.mdx" }]),
        [SHAS.middle]: tree([
          { object: "4".repeat(40), path: "docs/page.mdx" },
        ]),
      },
    });
    await expect(
      findCandidateShas({
        headSha: SHAS.head,
        mergeBaseSha: SHAS.merge,
        headFingerprint: current,
        watchPaths: WATCH_PATHS,
        execImpl: git.execImpl,
      }),
    ).resolves.toEqual([SHAS.head]);
  });
});

describe("GitHub check-run API", () => {
  it("uses the fixed, authenticated API endpoint and latest filter", async () => {
    const url = checkRunsUrl("joe-bell/cva", SHAS.head, 2);
    expect(url.origin).toBe("https://api.github.com");
    expect(url.pathname).toBe(
      `/repos/joe-bell/cva/commits/${SHAS.head}/check-runs`,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      app_id: String(CLOUDFLARE_APP_ID),
      check_name: CHECK_NAME,
      filter: "latest",
      page: "2",
      per_page: String(CHECK_RUNS_PER_PAGE),
    });

    const fetched = fetchFixture([checkPage([])]);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: fetched.fetchImpl,
        token: "test-token",
      }),
    ).resolves.toEqual(checkPage([]));
    expect(fetched.calls[0].options).toMatchObject({
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer test-token",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "error",
    });
    expect(fetched.calls[0].options.signal).toBeInstanceOf(AbortSignal);
    expect(() => checkRunsUrl("joe-bell/cva", "invalid", 1)).toThrow(
      /40-character Git SHA/,
    );
    expect(() => checkRunsUrl(1, SHAS.head, 1)).toThrow(/owner\/name/);
    expect(() => checkRunsUrl("joe-bell/cva", SHAS.head, 0)).toThrow(
      /positive integer/,
    );
  });

  it("bounds API requests and rejects malformed, failed, or slow responses", async () => {
    const budget = createRequestBudget(1);
    budget.consume();
    expect(budget.used).toBe(1);
    expect(() => budget.consume()).toThrow(/request API limit/);
    expect(() => createRequestBudget(0)).toThrow(/positive integer/);

    const url = checkRunsUrl("joe-bell/cva", SHAS.head, 1);
    await expect(
      fetchGitHubJson(new URL("https://example.com"), { token: "test-token" }),
    ).rejects.toThrow(/GitHub API origin/);
    await expect(fetchGitHubJson(url)).rejects.toThrow(/token/);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: async () => response({}, { ok: false, status: 429 }),
        token: "test-token",
      }),
    ).rejects.toThrow(/HTTP 429/);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: async () => ({ ok: true }),
        token: "test-token",
      }),
    ).rejects.toThrow(/include JSON/);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: async () => ({ json: async () => ({}), ok: "true" }),
        token: "test-token",
      }),
    ).rejects.toThrow(/invalid response/);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: async () => response({}, { ok: false, status: "bad" }),
        token: "test-token",
      }),
    ).rejects.toThrow(/invalid status/);
    await expect(
      fetchGitHubJson(url, {
        requestBudget: {},
        token: "test-token",
      }),
    ).rejects.toThrow(/request budget/);
    await expect(
      fetchGitHubJson(url, { requestTimeoutMs: 0, token: "test-token" }),
    ).rejects.toThrow(/positive integer/);
    await expect(
      fetchGitHubJson(url, {
        fetchImpl: () => new Promise(() => {}),
        requestTimeoutMs: 1,
        token: "test-token",
      }),
    ).rejects.toThrow(/timed out/);
  });

  it("paginates every latest check-run page and rejects truncated pages", async () => {
    const first = Array.from({ length: CHECK_RUNS_PER_PAGE }, (_, index) => ({
      id: index + 1,
    }));
    const second = [{ id: CHECK_RUNS_PER_PAGE + 1 }];
    const fetched = fetchFixture([
      checkPage(first, CHECK_RUNS_PER_PAGE + 1),
      checkPage(second, CHECK_RUNS_PER_PAGE + 1),
    ]);

    await expect(
      listCloudflareCheckRuns({
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
        fetchImpl: fetched.fetchImpl,
      }),
    ).resolves.toHaveLength(CHECK_RUNS_PER_PAGE + 1);
    expect(
      fetched.calls.map(({ url }) => url.searchParams.get("page")),
    ).toEqual(["1", "2"]);

    const page = Array.from({ length: CHECK_RUNS_PER_PAGE }, () => ({}));
    const incomplete = fetchFixture([
      checkPage(page, CHECK_RUNS_PER_PAGE + 1),
      checkPage([], CHECK_RUNS_PER_PAGE + 1),
    ]);
    await expect(
      listCloudflareCheckRuns({
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
        fetchImpl: incomplete.fetchImpl,
      }),
    ).rejects.toThrow(/incomplete/);
    const changedCount = fetchFixture([
      checkPage(page, CHECK_RUNS_PER_PAGE + 1),
      checkPage([{}], CHECK_RUNS_PER_PAGE),
    ]);
    await expect(
      listCloudflareCheckRuns({
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
        fetchImpl: changedCount.fetchImpl,
      }),
    ).rejects.toThrow(/incomplete/);
    const excessivePage = fetchFixture([
      checkPage(page, CHECK_RUNS_PER_PAGE + 1),
      checkPage([{}, {}], CHECK_RUNS_PER_PAGE + 1),
    ]);
    await expect(
      listCloudflareCheckRuns({
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
        fetchImpl: excessivePage.fetchImpl,
      }),
    ).rejects.toThrow(/incomplete/);
    const oversized = fetchFixture([checkPage([], MAX_CHECK_RUNS + 1)]);
    await expect(
      listCloudflareCheckRuns({
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
        fetchImpl: oversized.fetchImpl,
      }),
    ).rejects.toThrow(/truncated/);
    expect(() =>
      parseCheckRunsPage({ check_runs: [], total_count: -1 }),
    ).toThrow(/malformed/);
    expect(() => parseCheckRunsPage([])).toThrow(/malformed/);
    expect(() =>
      parseCheckRunsPage({ check_runs: "", total_count: 0 }),
    ).toThrow(/malformed/);
    expect(() =>
      parseCheckRunsPage({
        check_runs: Array.from({ length: CHECK_RUNS_PER_PAGE + 1 }),
        total_count: CHECK_RUNS_PER_PAGE + 1,
      }),
    ).toThrow(/malformed/);
  });

  it("fails when its bounded deadline has already expired", async () => {
    const fetched = fetchFixture([checkPage([])]);
    await expect(
      listCloudflareCheckRuns({
        clock: () => 10,
        deadline: 10,
        fetchImpl: fetched.fetchImpl,
        repository: "joe-bell/cva",
        sha: SHAS.head,
        token: "test-token",
      }),
    ).rejects.toThrow(/Timed out/);
    expect(fetched.calls).toHaveLength(0);
  });
});

describe("authoritative Cloudflare checks", () => {
  it("ignores wrong app, name, and SHA while selecting the latest exact attempt", () => {
    const older = checkRun({ id: 1 });
    const newerFailure = checkRun({
      conclusion: "failure",
      id: 2,
      started_at: "2026-09-17T12:02:00.000Z",
      completed_at: "2026-09-17T12:03:00.000Z",
    });
    const selected = selectLatestCloudflareCheck(
      [
        { ...older, app: { id: 1, slug: "other" } },
        { ...older, name: "Workers Builds: another project" },
        { ...older, head_sha: SHAS.side },
        older,
        newerFailure,
      ],
      SHAS.head,
    );

    expect(selected).toMatchObject({ conclusion: "failure", id: 2 });
    expect(cloudflareCheckOutcome(selected)).toBe("failure");
    expect(cloudflareCheckOutcome(older)).toBe("success");
    expect(
      cloudflareCheckOutcome(checkRun({ status: "queued", conclusion: null })),
    ).toBe("pending");
  });

  it("fails closed for malformed authoritative check runs", () => {
    expect(() => selectLatestCloudflareCheck({}, SHAS.head)).toThrow(/array/);
    expect(() => selectLatestCloudflareCheck([null], SHAS.head)).toThrow(
      /malformed/,
    );
    expect(() =>
      selectLatestCloudflareCheck([checkRun({ app: null })], SHAS.head),
    ).toThrow(/identify its GitHub App/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ head_sha: "invalid" })],
        SHAS.head,
      ),
    ).toThrow(/40-character Git SHA/);
    expect(() =>
      selectLatestCloudflareCheck([checkRun({ status: "invalid" })], SHAS.head),
    ).toThrow(/invalid status/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ status: "completed", conclusion: "unknown" })],
        SHAS.head,
      ),
    ).toThrow(/invalid conclusion/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ status: "queued", conclusion: "success" })],
        SHAS.head,
      ),
    ).toThrow(/unexpected conclusion/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ completed_at: "invalid" })],
        SHAS.head,
      ),
    ).toThrow(/ISO timestamp/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ started_at: "2026-09-17" })],
        SHAS.head,
      ),
    ).toThrow(/ISO timestamp/);
    expect(() =>
      selectLatestCloudflareCheck([checkRun({ completed_at: 1 })], SHAS.head),
    ).toThrow(/ISO timestamp/);
    expect(() =>
      selectLatestCloudflareCheck(
        [checkRun({ completed_at: "2026-99-17T12:00:00.000Z" })],
        SHAS.head,
      ),
    ).toThrow(/ISO timestamp/);
  });

  it("uses the check ID before timestamps to order matching attempts", () => {
    expect(
      selectLatestCloudflareCheck(
        [
          checkRun({ id: 1, started_at: "2026-09-17T12:03:00.000Z" }),
          checkRun({
            conclusion: "failure",
            id: 2,
            started_at: "2026-09-17T12:00:00.000Z",
          }),
        ],
        SHAS.head,
      ),
    ).toMatchObject({ conclusion: "failure", id: 2 });
  });
});

describe("bounded check polling", () => {
  it("returns an immediate success and refuses a completed failure", async () => {
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        initialCheck: checkRun(),
        lookupCheck: async () => undefined,
        deadline: 100,
        clock: () => 0,
      }),
    ).resolves.toMatchObject({ candidateSha: SHAS.head });
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        initialCheck: checkRun({ conclusion: "failure" }),
        lookupCheck: async () => undefined,
        deadline: 100,
        clock: () => 0,
      }),
    ).rejects.toThrow(/refusing to use an older result/);
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        initialCheck: checkRun(),
        lookupCheck: async () => undefined,
        deadline: 0,
        clock: () => 0,
      }),
    ).rejects.toThrow(/Timed out/);
  });

  it("polls a pending result and stops at the deadline or poll cap", async () => {
    let now = 0;
    const sleeps = [];
    const results = [
      checkRun({ status: "queued", conclusion: null }),
      checkRun(),
    ];
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        initialCheck: results.shift(),
        lookupCheck: async () => results.shift(),
        deadline: 100,
        clock: () => now,
        sleepImpl: async (ms) => {
          sleeps.push(ms);
          now += ms;
        },
        pollIntervalMs: 10,
      }),
    ).resolves.toMatchObject({ candidateSha: SHAS.head });
    expect(sleeps).toEqual([10]);

    now = 0;
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        lookupCheck: async () => undefined,
        deadline: 10,
        clock: () => now,
        sleepImpl: async (ms) => {
          now += ms;
        },
        pollIntervalMs: 10,
      }),
    ).rejects.toThrow(/Timed out/);
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        lookupCheck: async () => undefined,
        deadline: 100,
        clock: () => 0,
        sleepImpl: async () => undefined,
        maxPollAttempts: 1,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/poll wait limit/);
  });

  it("validates polling dependencies and can use its default sleep", async () => {
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        deadline: 1,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/lookup function/);
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        deadline: Number.NaN,
        lookupCheck: async () => undefined,
      }),
    ).rejects.toThrow(/finite timestamp/);

    let attempts = 0;
    await expect(
      waitForCloudflareCheck({
        candidateSha: SHAS.head,
        deadline: Date.now() + 100,
        lookupCheck: async () => {
          attempts += 1;
          return checkRun();
        },
        pollIntervalMs: 1,
      }),
    ).resolves.toMatchObject({ candidateSha: SHAS.head });
    expect(attempts).toBe(1);
  });
});

function changedVerificationFixture({
  ancestors = [SHAS.head],
  trees = {},
} = {}) {
  return gitFixture({
    ancestors,
    trees: {
      [SHAS.base]: tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]),
      [SHAS.head]: tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]),
      [SHAS.merge]: tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]),
      ...trees,
    },
  });
}

function verificationOptions(git, fetchImpl, extra = {}) {
  return {
    baseSha: SHAS.base,
    headSha: SHAS.head,
    repository: "joe-bell/cva",
    token: "test-token",
    watchPaths: WATCH_PATHS,
    execImpl: git.execImpl,
    fetchImpl,
    clock: () => 0,
    ...extra,
  };
}

describe("Cloudflare gate", () => {
  it("passes without an API call when base-only watched changes leave the merge base and head equal", async () => {
    const unchanged = tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      trees: {
        [SHAS.base]: tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]),
        [SHAS.head]: unchanged,
        [SHAS.merge]: unchanged,
      },
    });
    let fetches = 0;

    await expect(
      verifyCloudflareBuild(
        verificationOptions(git, async () => {
          fetches += 1;
          return response(checkPage([]));
        }),
      ),
    ).resolves.toEqual({ candidateSha: SHAS.head, state: "unchanged" });
    expect(fetches).toBe(0);
    expect(git.calls).toContainEqual([
      "merge-base",
      "--all",
      SHAS.base,
      SHAS.head,
    ]);
    expect(git.calls).not.toContainEqual([
      "ls-tree",
      "--full-tree",
      "-r",
      "-z",
      SHAS.base,
    ]);
  });

  it("uses the newest matching ancestor with an exact successful check", async () => {
    const current = tree([{ object: "2".repeat(40), path: "docs/page.mdx" }]);
    const git = changedVerificationFixture({
      ancestors: [SHAS.head, SHAS.middle, SHAS.previous],
      trees: {
        [SHAS.middle]: tree([
          { object: "3".repeat(40), path: "docs/page.mdx" },
        ]),
        [SHAS.previous]: current,
      },
    });
    const fetched = fetchFixture([
      checkPage([]),
      checkPage([checkRun({ head_sha: SHAS.previous })]),
    ]);

    await expect(
      verifyCloudflareBuild(verificationOptions(git, fetched.fetchImpl)),
    ).resolves.toMatchObject({ candidateSha: SHAS.previous });
    expect(fetched.calls.map(({ url }) => url.pathname.split("/")[5])).toEqual([
      SHAS.head,
      SHAS.previous,
    ]);
  });

  it("polls a pending check and fails on a newer completed failure", async () => {
    const pendingGit = changedVerificationFixture();
    const pendingFetch = fetchFixture([
      checkPage([checkRun({ conclusion: null, status: "queued" })]),
      checkPage([checkRun()]),
    ]);
    let now = 0;
    await expect(
      verifyCloudflareBuild(
        verificationOptions(pendingGit, pendingFetch.fetchImpl, {
          clock: () => now,
          pollIntervalMs: 10,
          sleepImpl: async (ms) => {
            now += ms;
          },
        }),
      ),
    ).resolves.toMatchObject({ candidateSha: SHAS.head });

    const failedGit = changedVerificationFixture();
    const failedFetch = fetchFixture([
      checkPage([checkRun({ conclusion: "failure" })]),
    ]);
    await expect(
      verifyCloudflareBuild(
        verificationOptions(failedGit, failedFetch.fetchImpl),
      ),
    ).rejects.toThrow(/refusing to use an older result/);
  });

  it("polls a newer queued check whose start time is null", async () => {
    const git = changedVerificationFixture();
    const fetched = fetchFixture([
      checkPage([
        checkRun({ id: 1 }),
        checkRun({
          completed_at: null,
          conclusion: null,
          id: 2,
          started_at: null,
          status: "queued",
        }),
      ]),
      checkPage([checkRun({ id: 2, started_at: null })]),
    ]);
    let now = 0;

    await expect(
      verifyCloudflareBuild(
        verificationOptions(git, fetched.fetchImpl, {
          clock: () => now,
          pollIntervalMs: 10,
          sleepImpl: async (ms) => {
            now += ms;
          },
        }),
      ),
    ).resolves.toMatchObject({
      candidateSha: SHAS.head,
      checkRun: { id: 2, status: "completed" },
    });
    expect(fetched.calls).toHaveLength(2);
  });

  it("polls the head when no candidate has a check and fails closed at timeout", async () => {
    const git = changedVerificationFixture();
    const fetched = fetchFixture([checkPage([]), checkPage([]), checkPage([])]);
    let now = 0;

    await expect(
      verifyCloudflareBuild(
        verificationOptions(git, fetched.fetchImpl, {
          clock: () => now,
          gateTimeoutMs: 20,
          pollIntervalMs: 10,
          sleepImpl: async (ms) => {
            now += ms;
          },
        }),
      ),
    ).rejects.toThrow(/Timed out/);
  });

  it("loads watch paths through its injected reader", async () => {
    const identical = tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      trees: {
        [SHAS.base]: identical,
        [SHAS.head]: identical,
        [SHAS.merge]: identical,
      },
    });
    await expect(
      verifyCloudflareBuild(
        verificationOptions(git, async () => response(checkPage([])), {
          readFileImpl: async () => JSON.stringify(WATCH_PATHS),
          watchPaths: undefined,
        }),
      ),
    ).resolves.toMatchObject({ state: "unchanged" });
  });

  it("fails closed when the injected clock is invalid", async () => {
    const git = gitFixture({ trees: {} });
    await expect(
      verifyCloudflareBuild(
        verificationOptions(git, async () => response(checkPage([])), {
          clock: () => Number.NaN,
        }),
      ),
    ).rejects.toThrow(/Clock returned an invalid time/);
  });
});

describe("environment entrypoint", () => {
  it("reads only the gate inputs and supports import-safe invocation", async () => {
    expect(
      readGateEnvironment({
        BASE_SHA: SHAS.base,
        GITHUB_TOKEN: "test-token",
        HEAD_SHA: SHAS.head,
        REPOSITORY: "joe-bell/cva",
      }),
    ).toEqual({
      baseSha: SHAS.base,
      headSha: SHAS.head,
      repository: "joe-bell/cva",
      token: "test-token",
    });
    expect(parseRepository("joe-bell/cva")).toEqual({
      owner: "joe-bell",
      repo: "cva",
    });
    expect(() => parseRepository("joe-bell/cva/extra")).toThrow(/owner\/name/);

    const identical = tree([{ object: "1".repeat(40), path: "docs/page.mdx" }]);
    const git = gitFixture({
      trees: {
        [SHAS.base]: identical,
        [SHAS.head]: identical,
        [SHAS.merge]: identical,
      },
    });
    const log = console.log;
    console.log = () => undefined;
    try {
      await expect(
        main(
          {
            BASE_SHA: SHAS.base,
            GITHUB_TOKEN: "test-token",
            HEAD_SHA: SHAS.head,
            REPOSITORY: "joe-bell/cva",
          },
          { execImpl: git.execImpl, watchPaths: WATCH_PATHS },
        ),
      ).resolves.toMatchObject({ state: "unchanged" });
    } finally {
      console.log = log;
    }
  });

  it("prints the Cloudflare result when an exact check satisfies a changed tree", async () => {
    const git = changedVerificationFixture();
    const log = console.log;
    const messages = [];
    console.log = (message) => messages.push(message);
    try {
      await expect(
        main(
          {
            BASE_SHA: SHAS.base,
            GITHUB_TOKEN: "test-token",
            HEAD_SHA: SHAS.head,
            REPOSITORY: "joe-bell/cva",
          },
          {
            execImpl: git.execImpl,
            fetchImpl: fetchFixture([checkPage([checkRun()])]).fetchImpl,
            watchPaths: WATCH_PATHS,
          },
        ),
      ).resolves.toMatchObject({ candidateSha: SHAS.head });
    } finally {
      console.log = log;
    }
    expect(messages).toEqual([
      `Cloudflare gate passed with ${CHECK_NAME} for ${SHAS.head}.`,
    ]);
  });
});
