import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Element, Root } from "hast";
import { select } from "hast-util-select";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { htmlToMarkdown, renderedDocContent } from "../lib/html-to-markdown";

function frontmatter({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: URL;
}) {
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\nurl: ${JSON.stringify(url.toString())}\n---\n\n`;
}

function property(element: Element | null | undefined, name: string) {
  const value = element?.properties[name];
  return typeof value === "string" ? value : undefined;
}

function metadataFromRenderedPage(html: string, site: URL) {
  const tree = unified().use(rehypeParse).parse(html) as Root;
  const alternate = property(
    select('link[rel~="alternate"][type="text/markdown"]', tree),
    "href",
  );
  if (!alternate) return;

  const title = select("title", tree)
    ?.children.map((child) => (child.type === "text" ? child.value : ""))
    .join("")
    .trim()
    .replace(/\s+\|\s+cva$/, "");
  const description = property(
    select('meta[name="description"]', tree),
    "content",
  );
  const canonical = property(select('link[rel="canonical"]', tree), "href");
  if (!title || !description || !canonical) {
    throw new Error(
      "Rendered documentation page is missing Markdown metadata.",
    );
  }

  const markdownUrl = new URL(alternate, site);
  if (
    markdownUrl.origin !== site.origin ||
    !markdownUrl.pathname.endsWith(".md") ||
    markdownUrl.pathname.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Invalid Markdown mirror URL: ${alternate}`);
  }

  return {
    title,
    description,
    url: new URL(canonical, site),
    markdownPath: markdownUrl.pathname.slice(1),
  };
}

async function renderedHtmlPages(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = await Promise.all(
    entries.map(async (entry) => {
      const path = new URL(entry.name, directory);
      if (entry.isDirectory())
        return renderedHtmlPages(new URL(`${entry.name}/`, directory));
      return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
    }),
  );
  return pages.flat();
}

/** Generate deterministic Markdown mirrors from Starlight's rendered HTML. */
export function markdownMirrors(): AstroIntegration {
  let site: URL;

  return {
    name: "markdown-mirrors",
    hooks: {
      "astro:config:setup": ({ config }) => {
        if (!config.site) {
          throw new Error(
            "Markdown mirrors require Astro's site configuration.",
          );
        }
        site = new URL(config.site);
      },
      "astro:build:setup": ({ target, vite }) => {
        if (target !== "server") return;

        vite.environments ??= {};
        vite.environments.prerender ??= {};
        vite.environments.prerender.resolve ??= {};
        const external = vite.environments.prerender.resolve.external;
        // Bundling Satteri relocates its native loader during a static build,
        // where it resolves an incompatible hoisted native package instead.
        vite.environments.prerender.resolve.external =
          external === true
            ? true
            : [...new Set([...(external ?? []), "satteri"])];
      },
      "astro:build:done": async ({ dir, logger }) => {
        const pages = await renderedHtmlPages(dir);

        for (const page of pages) {
          const html = await readFile(page, "utf-8");
          const metadata = metadataFromRenderedPage(html, site);
          if (!metadata) continue;
          const markdown = await htmlToMarkdown(
            renderedDocContent(html),
            metadata.url,
          );
          const output = new URL(metadata.markdownPath, dir);

          await mkdir(dirname(fileURLToPath(output)), { recursive: true });
          await writeFile(
            output,
            frontmatter({
              title: metadata.title,
              description: metadata.description,
              url: metadata.url,
            }) +
              markdown +
              "\n",
          );
        }

        logger.info("Generated Markdown mirrors from rendered documentation.");
      },
    },
  };
}
