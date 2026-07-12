/**
 * Generic sticky-PR-comment infrastructure: any CI producer can contribute
 * a named "section" to one shared comment per PR without clobbering other
 * sections. This is what makes it reusable beyond the benchmark workflow —
 * see .github/workflows/pr-comment.yml's header for the extension contract.
 *
 * Deliberately dependency-free (no octokit import): the `github` and
 * `context` objects are passed in by the caller (actions/github-script
 * already provides authenticated instances), so this module only ever
 * touches the plain data it's given — easy to unit test with fakes, and
 * nothing here can reach the network on its own.
 */

export const STICKY_MARKER = "<!-- cva:pr-comment -->";

/**
 * Canonical top-to-bottom layout of the comment. Sections render in this
 * order no matter which producer ran (or created its section) first, and
 * reordering this list reorders every existing comment on its next update.
 * A section id missing from the list still renders, after all listed ones,
 * in its original appearance order.
 */
export const SECTION_ORDER = ["benchmark"];

/** GitHub caps issue/PR comment bodies at 65536 characters. */
export const MAX_COMMENT_CHARS = 65536;

const SAFE_SECTION_ID = /^[a-z0-9-]+$/;

/** Fails before hitting the API when a rendered section would exceed GitHub's limit. */
export function assertCommentBodySize(body) {
  if (typeof body !== "string" || body.length > MAX_COMMENT_CHARS) {
    throw new Error(
      `comment body exceeds GitHub's ${MAX_COMMENT_CHARS}-character limit (${typeof body === "string" ? body.length : "non-string"} characters)`,
    );
  }
  return body;
}

function assertSectionId(id) {
  if (typeof id !== "string" || !SAFE_SECTION_ID.test(id)) {
    throw new Error(
      `invalid section id ${JSON.stringify(id)} — must match ${SAFE_SECTION_ID}`,
    );
  }
  return id;
}

function sectionMarkers(id) {
  return {
    start: `<!-- cva:section:${id}:start -->`,
    end: `<!-- cva:section:${id}:end -->`,
  };
}

/** Wraps already-rendered, trusted markdown in this section's placeholders. */
export function sectionBlock(id, content) {
  const { start, end } = sectionMarkers(assertSectionId(id));
  // A literal section marker inside `content` would truncate this (or
  // another) section on the next parse-and-reassemble pass. The benchmark
  // producer can't hit this (compare.ts escapes every `<` in untrusted
  // input), but the extension contract invites future producers — fail
  // loudly here rather than silently corrupting the comment.
  if (content.includes("<!-- cva:section:")) {
    throw new Error(
      `section ${JSON.stringify(id)} content contains a literal section marker — escape untrusted input before rendering (see test/bench/scripts/compare.ts)`,
    );
  }
  return `${start}\n${content.trim()}\n${end}`;
}

const SECTION_PATTERN =
  /<!-- cva:section:([a-z0-9-]+):start -->\n?([\s\S]*?)\n?<!-- cva:section:\1:end -->/g;

/** Extracts `[{ id, content }]` from a comment body in appearance order. */
function parseSections(body) {
  return Array.from(body.matchAll(SECTION_PATTERN), (match) => ({
    id: match[1],
    content: match[2],
  }));
}

/**
 * Returns the full comment body with section `id` set to `content` and
 * every section laid out in canonical `order` (ids not in the list keep
 * their relative appearance order, after all listed ones).
 *
 * The whole body is reassembled from the sticky marker plus the parsed
 * sections — this module owns the comment outright, which is what makes
 * reordering `SECTION_ORDER` retroactive. Only our own placeholder markers
 * are ever parsed; each section's `content` is spliced back verbatim (it
 * must already be trusted-rendered markdown by the time it reaches this
 * function).
 */
export function upsertSection(body, id, content, order = SECTION_ORDER) {
  assertSectionId(id);

  const sections = parseSections(body).filter((section) => section.id !== id);
  sections.push({ id, content: content.trim() });

  const rank = (sectionId) => {
    const index = order.indexOf(sectionId);
    return index === -1 ? order.length : index;
  };
  // Array.prototype.sort is stable, so unlisted ids keep appearance order.
  sections.sort((a, b) => rank(a.id) - rank(b.id));

  return [
    STICKY_MARKER,
    ...sections.map((section) => sectionBlock(section.id, section.content)),
  ].join("\n\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Finds the sticky comment on `issueNumber`, retrying with a delay if it
 * isn't there yet — a section producer that isn't allowed to create the
 * comment (see `createIfMissing` below) waits for whichever producer is
 * the primary one to create it first, instead of giving up immediately.
 */
export async function findStickyComment({
  github,
  context,
  issueNumber,
  retries = 0,
  retryDelayMs = 5000,
}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...context.repo,
      issue_number: issueNumber,
      per_page: 100,
    });
    const existing = comments.find(
      (comment) =>
        comment.user?.type === "Bot" && comment.body?.startsWith(STICKY_MARKER),
    );
    if (existing) return existing;
    if (attempt < retries) await sleep(retryDelayMs);
  }
  return undefined;
}

/**
 * Adds or updates `sectionId` in the shared sticky comment on `issueNumber`.
 *
 * Set `createIfMissing: true` only for the section that should create the
 * comment when no other section has yet — typically the first/primary
 * producer wired up for a given repo. Every other producer should leave it
 * `false` (the default) and rely on `retries`/`retryDelayMs` to wait for
 * that producer's run instead of racing to create a duplicate comment.
 */
export async function upsertPrComment({
  github,
  context,
  issueNumber,
  sectionId,
  sectionContent,
  createIfMissing = false,
  retries = 0,
  retryDelayMs = 5000,
  order = SECTION_ORDER,
}) {
  const existing = await findStickyComment({
    github,
    context,
    issueNumber,
    retries,
    retryDelayMs,
  });

  if (existing) {
    const body = assertCommentBodySize(
      upsertSection(
        existing.body ?? STICKY_MARKER,
        sectionId,
        sectionContent,
        order,
      ),
    );
    await github.rest.issues.updateComment({
      ...context.repo,
      comment_id: existing.id,
      body,
    });
    return { action: "updated", commentId: existing.id };
  }

  if (!createIfMissing) {
    return { action: "skipped-no-comment" };
  }

  const body = assertCommentBodySize(
    upsertSection(STICKY_MARKER, sectionId, sectionContent, order),
  );
  const created = await github.rest.issues.createComment({
    ...context.repo,
    issue_number: issueNumber,
    body,
  });
  return { action: "created", commentId: created.data.id };
}
