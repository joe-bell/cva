import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AstroIntegration, ValidRedirectStatus } from "astro";

type Redirects = Record<
  string,
  { status: ValidRedirectStatus; destination: string }
>;

export interface VersionRedirectsOptions {
  /** Project-root-relative path to the docs content directory, e.g.
   *  `"src/content/docs"`. */
  docs: string;
  /** Archived version slugs, e.g. `["beta"]`. The current (latest) version is
   *  implicit and represented internally by the empty string. */
  versions: readonly string[];
  /** Pages that live only at the root rather than per version (e.g.
   *  `"sponsors"`, `"llms.txt"`); each version permanently redirects its copy
   *  back to that root page. */
  redirectToRoot?: readonly string[];
}

// Drop a trailing slash (keeping root `/`) so the slash and slash-free variants
// Astro emits for each redirect collapse to one comparison key.
const normalize = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

// Enumerate doc page slugs (version-prefixed, extension-free) from the docs
// content directory — the same `**/*.{md,mdx}` files Starlight's `docsLoader()`
// reads, globbed here because redirects must be known before the content layer
// has loaded.
const docsPageSlugs = (docsDir: URL): string[] =>
  readdirSync(docsDir, { recursive: true })
    .map((entry) => String(entry).replaceAll("\\", "/"))
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => file.replace(/\.mdx?$/, ""));

/**
 * Computes every redirect needed to paper over differences between doc
 * versions:
 *
 * - **Root-only pages** (`sponsors`, `llms.txt`, …) only exist at the root, so
 *   each version permanently (`301`) redirects its copy back to that page.
 * - **Page gaps** — `starlight-versions` rewrites the URL in place when you
 *   switch versions, with no check that the target exists, so a page present in
 *   only some versions 404s in the others. For every such gap we temporarily
 *   (`302`, since the page may be added to the other version later) redirect the
 *   would-be-missing URL to that version's home.
 */
const buildRedirects = (
  { versions, redirectToRoot = [] }: VersionRedirectsOptions,
  pages: readonly string[],
): Redirects => {
  const allVersions = ["", ...versions];
  const redirects: Redirects = {};

  for (const version of versions) {
    for (const page of redirectToRoot) {
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
 * it discovers the doc pages under the `docs` directory and injects the
 * resulting redirects into the build config (`astro:config:setup`), then asserts
 * that every one reached the emitted `_redirects` (`astro:build:done`).
 *
 * Following Starlight, content is located by globbing the filesystem (resolved
 * against `config.root`) rather than passed in — `getCollection` isn't available
 * this early in the build, before the content layer has loaded.
 *
 * The assertion catches regressions the type checker can't — the
 * `@astrojs/cloudflare` adapter's serialisation or the `order-redirects` pass
 * silently dropping or mangling a rule.
 */
export const versionRedirects = (
  options: VersionRedirectsOptions,
): AstroIntegration => {
  let redirects: Redirects = {};

  return {
    name: "version-redirects",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        const docsDir = new URL(options.docs.replace(/\/?$/, "/"), config.root);
        redirects = buildRedirects(options, docsPageSlugs(docsDir));
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
