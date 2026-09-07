import type { Root, RootContent } from "hast";
import { matches, select, selectAll } from "hast-util-select";
import { toHtml } from "hast-util-to-html";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { remove } from "unist-util-remove";

/*
 * Adapted from starlight-llms-txt's conversion pipeline. The plugin exposes
 * only its integration entry point, while these page mirrors need the same
 * component-aware rendering at build time.
 *
 * MIT License
 *
 * Copyright (c) 2025-present, delucis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
function absolutizeUrls(page: URL) {
  return () => (tree: Root) => {
    for (const element of selectAll("[href], [src]", tree)) {
      for (const attribute of ["href", "src"] as const) {
        const value = element.properties[attribute];
        if (
          typeof value === "string" &&
          !value.startsWith("#") &&
          !value.startsWith("mailto:")
        ) {
          element.properties[attribute] = new URL(value, page).toString();
        }
      }
    }
  };
}

function textContent(node: RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
}

function markdownPipeline(page: URL) {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(function removeUnsupportedContent() {
      return (tree) => {
        remove(tree, (node) => {
          const content = node as RootContent;
          return (
            matches("iframe", content) ||
            matches(".sl-anchor-link", content) ||
            matches(".sr-only", content)
          );
        });
      };
    })
    .use(function improveExpressiveCodeHandling() {
      return (tree) => {
        for (const instance of selectAll(".expressive-code", tree as Root)) {
          const pre = select("pre", instance);
          const code = select("code", instance);
          if (pre?.properties.dataLanguage && code) {
            if (!Array.isArray(code.properties.className)) {
              code.properties.className = [];
            }
            code.properties.className.push(
              `language-${pre.properties.dataLanguage}`,
            );
          }
        }
      };
    })
    .use(function improveTabsHandling() {
      return (tree) => {
        for (const instance of selectAll("starlight-tabs", tree as Root)) {
          const tabs = selectAll('[role="tab"]', instance);
          const panels = selectAll('[role="tabpanel"]', instance);
          instance.tagName = "ul";
          instance.properties = {};
          instance.children = [];

          for (const [index, tab] of tabs.slice(0, panels.length).entries()) {
            const panel = panels[index]!;
            const label = textContent(tab).trim();
            instance.children.push({
              type: "element",
              tagName: "li",
              properties: {},
              children: [
                {
                  type: "element",
                  tagName: "p",
                  properties: {},
                  children: [{ type: "text", value: label }],
                },
                panel,
              ],
            });
          }
        }
      };
    })
    .use(absolutizeUrls(page))
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify);
}

export async function htmlToMarkdown(html: string, page: URL) {
  const file = await markdownPipeline(page).process(html);
  return String(file).trim();
}

/** Extract the rendered Starlight document body without navigation or page chrome. */
export function renderedDocContent(html: string) {
  const tree = unified().use(rehypeParse).parse(html) as Root;
  const content = select(".sl-markdown-content", tree);
  if (!content) {
    throw new Error("Could not find rendered Starlight document content.");
  }

  return toHtml({ type: "root", children: content.children });
}
