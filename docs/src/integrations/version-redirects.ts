import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AstroIntegration, ValidRedirectStatus } from "astro";

/**
 * Builds redirects that smooth over page differences between doc versions.
 *
 * `starlight-versions` rewrites the URL in place when you switch versions, with
 * no check that the target page exists. Switching a page that only lives in one
 * version — e.g. `/beta/getting-started/whats-new` → "Latest" — therefore lands
 * on a missing URL and a jarring 404.
 *
 * For every page present in some versions but not others, this emits a redirect
 * from the would-be-missing URL to that version's home, derived from the actual
 * content on disk so it always reflects the real discrepancies (no hand-kept
 * list). They're `302` (temporary) on purpose: a page absent today may be added
 * later, at which point its own page should win over this fallback.
 *
 * @param docsDir - URL of the `src/content/docs` directory.
 * @param versionSlugs - Archived version slugs (e.g. `["beta"]`). The current
 *   (latest) version is represented internally by the empty string.
 */
export const versionPageRedirects = (
  docsDir: URL,
  versionSlugs: readonly string[],
): Record<string, { status: ValidRedirectStatus; destination: string }> => {
  const versions = ["", ...versionSlugs];

  // version slug -> set of page paths it contains, where a "page path" is the
  // page's slug minus its version prefix (so equivalent pages across versions
  // share a key). The home page (`index`) is skipped: every version has one, so
  // it can never be a discrepancy.
  const pagesByVersion = new Map(
    versions.map((slug) => [slug, new Set<string>()]),
  );

  for (const entry of readdirSync(docsDir, { recursive: true })) {
    const file = String(entry).replaceAll("\\", "/");
    if (!/\.mdx?$/.test(file)) continue;

    const slug = file.replace(/\.mdx?$/, "");
    const version =
      versionSlugs.find((s) => slug === s || slug.startsWith(`${s}/`)) ?? "";
    const path = version ? slug.slice(version.length + 1) : slug;

    if (path === "index") continue;
    pagesByVersion.get(version)?.add(path);
  }

  const allPages = new Set(
    [...pagesByVersion.values()].flatMap((pages) => [...pages]),
  );

  const redirects: Record<
    string,
    { status: ValidRedirectStatus; destination: string }
  > = {};

  for (const version of versions) {
    const home = version ? `/${version}/` : "/";
    for (const path of allPages) {
      if (pagesByVersion.get(version)?.has(path)) continue;
      const source = version ? `/${version}/${path}` : `/${path}`;
      redirects[source] = { status: 302, destination: home };
    }
  }

  return redirects;
};

// Normalise a path for comparison: drop a trailing slash (but keep root `/`),
// so the slash and slash-free variants Astro emits for each redirect collapse
// to one key.
const normalize = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

/**
 * Build-time guard that the `versionPageRedirects` actually reach the deployed
 * `_redirects`. It recomputes the expected redirects and fails the build if any
 * are missing or point somewhere unexpected — catching regressions in the
 * config wiring, the `@astrojs/cloudflare` adapter's serialisation, or the
 * `order-redirects` pass, none of which a type check would surface.
 *
 * @param docsDir - URL of the `src/content/docs` directory.
 * @param versionSlugs - Archived version slugs, matching `versionPageRedirects`.
 */
export const assertVersionRedirects = (
  docsDir: URL,
  versionSlugs: readonly string[],
): AstroIntegration => ({
  name: "assert-version-redirects",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const expected = Object.entries(
        versionPageRedirects(docsDir, versionSlugs),
      );
      if (expected.length === 0) return;

      let contents: string;
      try {
        contents = await readFile(new URL("./_redirects", dir), "utf-8");
      } catch {
        throw new Error(
          `Expected ${expected.length} version redirect(s) but no _redirects file was emitted.`,
        );
      }

      // Parse `SOURCE  DESTINATION  STATUS` lines, keyed by normalised source.
      const emitted = new Map<
        string,
        { destination: string; status: string }
      >();
      for (const line of contents.split("\n")) {
        const [source, destination, status] = line.trim().split(/\s+/);
        if (!source || !destination) continue;
        emitted.set(normalize(source), { destination, status: status ?? "" });
      }

      const problems = expected.flatMap(([source, { destination, status }]) => {
        const found = emitted.get(normalize(source));
        if (!found) return [`${source} → ${destination} (missing)`];
        if (
          normalize(found.destination) !== normalize(destination) ||
          found.status !== String(status)
        ) {
          return [
            `${source} → ${found.destination} (${found.status}), expected ${destination} (${status})`,
          ];
        }
        return [];
      });

      if (problems.length > 0) {
        throw new Error(
          `Version redirects missing or incorrect in _redirects:\n  ${problems.join("\n  ")}`,
        );
      }

      logger.info(`Verified ${expected.length} version redirect(s).`);
    },
  },
});
