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

function sectionMarkers(id) {
  return {
    start: `<!-- cva:section:${id}:start -->`,
    end: `<!-- cva:section:${id}:end -->`,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps already-rendered, trusted markdown in this section's placeholders. */
export function sectionBlock(id, content) {
  const { start, end } = sectionMarkers(id);
  return `${start}\n${content.trim()}\n${end}`;
}

/**
 * Returns `body` with section `id` replaced in place if its markers are
 * already present, or the section appended otherwise. Only ever matches
 * against our own placeholder markers — the section `content` itself is
 * never parsed or interpreted, just spliced in verbatim (it must already
 * be trusted-rendered markdown by the time it reaches this function).
 */
export function upsertSection(body, id, content) {
  const { start, end } = sectionMarkers(id);
  const block = sectionBlock(id, content);
  const pattern = new RegExp(
    `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`,
  );

  if (pattern.test(body)) {
    return body.replace(pattern, block);
  }

  const trimmed = body.trimEnd();
  return trimmed.length > 0 ? `${trimmed}\n\n${block}` : block;
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
}) {
  const existing = await findStickyComment({
    github,
    context,
    issueNumber,
    retries,
    retryDelayMs,
  });

  if (existing) {
    const body = upsertSection(
      existing.body ?? STICKY_MARKER,
      sectionId,
      sectionContent,
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

  const body = upsertSection(STICKY_MARKER, sectionId, sectionContent);
  const created = await github.rest.issues.createComment({
    ...context.repo,
    issue_number: issueNumber,
    body,
  });
  return { action: "created", commentId: created.data.id };
}
