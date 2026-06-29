import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AstroIntegration, ValidRedirectStatus } from "astro";

type Redirects = Record<
  string,
  { status: ValidRedirectStatus; destination: string }
>;

export interface VersionRedirectsOptions {
  /** Project-root-relative path to the docs content directory. */
  docs: string;
  /** Archived version slugs, e.g. `["beta"]`. */
  versions: readonly string[];
  /** Root-only pages (e.g. `"sponsors"`, `"llms.txt"`) for which a versioned
   *  redirect to the root page is created per version, e.g. `/beta/sponsors` →
   *  `/sponsors`. */
  versionedRedirectsToRoot?: readonly string[];
}

// Astro emits both a trailing-slash and a slash-free variant for each redirect;
// drop the trailing slash (keeping root `/`) to compare them as one.
const normalize = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

// Glob the doc page slugs (version-prefixed, extension-free) straight off disk —
// the same files Starlight's `docsLoader()` reads. Redirects must be known
// before the content layer loads, so `getCollection` is too late to use here.
const docsPageSlugs = (docsDir: URL): string[] =>
  readdirSync(docsDir, { recursive: true })
    .map((entry) => String(entry).replaceAll("\\", "/"))
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => file.replace(/\.mdx?$/, ""));

/**
 * Builds the version redirects for the docs site. Pages listed in
 * `versionedRedirectsToRoot` only exist at the root, so each version gets a copy
 * that permanently redirects back to it. For pages present in some versions but
 * not others — `starlight-versions` switches versions by rewriting the URL in
 * place without checking the target exists — the missing URL temporarily
 * redirects to that version's home, since the page may be added later.
 */
const buildRedirects = (
  { versions, versionedRedirectsToRoot = [] }: VersionRedirectsOptions,
  pages: readonly string[],
): Redirects => {
  const allVersions = ["", ...versions];
  const redirects: Redirects = {};

  for (const version of versions) {
    for (const page of versionedRedirectsToRoot) {
      redirects[`/${version}/${page}`] = {
        status: 301,
        destination: `/${page}`,
      };
    }
  }

  // Group each version's page paths (the slug minus its version prefix) so
  // equivalent pages share a key. `index` is every version's home, never a gap.
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
 * Injects the docs version redirects at `astro:config:setup`, then verifies at
 * `astro:build:done` that they all reached the emitted `_redirects`.
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

        // Each emitted line is `<source> <destination> <status>`.
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
