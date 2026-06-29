import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AstroIntegration, ValidRedirectStatus } from "astro";

type Redirects = Record<
  string,
  { status: ValidRedirectStatus; destination: string }
>;

export interface VersionRedirectsOptions {
  /** Archived version slugs, e.g. `["beta"]`. The current (latest) version is
   *  implicit and represented internally by the empty string. */
  versions: readonly string[];
  /** Every doc page slug across all versions — version-prefixed and without
   *  extension, e.g. `"getting-started/installation"` or
   *  `"beta/getting-started/whats-new"`. See {@link docsPageSlugs}. */
  pages: readonly string[];
  /** Root-only pages that live outside the versioned docs (e.g. `"sponsors"`,
   *  `"llms.txt"`); each version permanently redirects back to the latest one. */
  shared?: readonly string[];
}

// Drop a trailing slash (keeping root `/`) so the slash and slash-free variants
// Astro emits for each redirect collapse to one comparison key.
const normalize = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

/**
 * Computes every redirect needed to paper over differences between doc
 * versions:
 *
 * - **Shared pages** (`sponsors`, `llms.txt`, …) only exist at the root, so each
 *   version permanently (`301`) redirects back to the latest page.
 * - **Page gaps** — `starlight-versions` rewrites the URL in place when you
 *   switch versions, with no check that the target exists, so a page present in
 *   only some versions 404s in the others. For every such gap we temporarily
 *   (`302`, since the page may be added to the other version later) redirect the
 *   would-be-missing URL to that version's home.
 *
 * Pure in its inputs, so the integration can inject the result at config time
 * and re-derive the identical set to assert against at build time.
 */
const buildRedirects = ({
  versions,
  pages,
  shared = [],
}: VersionRedirectsOptions): Redirects => {
  const allVersions = ["", ...versions];
  const redirects: Redirects = {};

  for (const version of versions) {
    for (const page of shared) {
      redirects[`/${version}/${page}`] = {
        status: 301,
        destination: `/${page}`,
      };
    }
  }

  // version slug -> set of page paths it contains, where a "page path" is the
  // slug minus its version prefix (so equivalent pages across versions share a
  // key). The home page (`index`) is skipped: every version has one, so it can
  // never be a gap.
  const pagesByVersion = new Map(
    allVersions.map((slug) => [slug, new Set<string>()]),
  );
  for (const page of pages) {
    const version =
      versions.find((slug) => page === slug || page.startsWith(`${slug}/`)) ??
      "";
    const path = version ? page.slice(version.length + 1) : page;
    if (path === "index") continue;
    pagesByVersion.get(version)?.add(path);
  }

  const everyPage = new Set(
    [...pagesByVersion.values()].flatMap((paths) => [...paths]),
  );
  for (const version of allVersions) {
    const home = version ? `/${version}/` : "/";
    for (const path of everyPage) {
      if (pagesByVersion.get(version)?.has(path)) continue;
      const source = version ? `/${version}/${path}` : `/${path}`;
      redirects[source] = { status: 302, destination: home };
    }
  }

  return redirects;
};

/**
 * Astro integration that owns the documentation's version redirects end to end:
 * it injects them into the build config (`astro:config:setup`) and then asserts
 * that every one reached the emitted `_redirects` (`astro:build:done`).
 *
 * The assertion catches regressions the type checker can't — the
 * `@astrojs/cloudflare` adapter's serialisation or the `order-redirects` pass
 * silently dropping or mangling a rule.
 */
export const versionRedirects = (
  options: VersionRedirectsOptions,
): AstroIntegration => {
  const redirects = buildRedirects(options);

  return {
    name: "version-redirects",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({ redirects });
      },
      "astro:build:done": async ({ dir, logger }) => {
        const expected = Object.entries(redirects);
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

        const problems = expected.flatMap(
          ([source, { destination, status }]) => {
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
          },
        );

        if (problems.length > 0) {
          throw new Error(
            `Version redirects missing or incorrect in _redirects:\n  ${problems.join("\n  ")}`,
          );
        }

        logger.info(`Verified ${expected.length} version redirect(s).`);
      },
    },
  };
};

/**
 * Enumerates doc page slugs (version-prefixed, extension-free) from a
 * `src/content/docs` directory, ready to feed {@link versionRedirects}.
 */
export const docsPageSlugs = (docsDir: URL): string[] =>
  readdirSync(docsDir, { recursive: true })
    .map((entry) => String(entry).replaceAll("\\", "/"))
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => file.replace(/\.mdx?$/, ""));
