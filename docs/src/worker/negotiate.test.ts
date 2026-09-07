import {
  acceptsMarkdown,
  markdownAssetPaths,
  markdownAssetRequests,
  markdownResponse,
  isHtmlResponse,
  withAcceptVary,
} from "./negotiate";
import { describe, expect, it } from "vitest";

describe("Markdown negotiation", () => {
  it("selects Markdown only when it is preferred to HTML", () => {
    expect(acceptsMarkdown(new Request("https://cva.style/"))).toBe(false);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: { Accept: "text/markdown;q=0.9, text/html;q=0.8" },
        }),
      ),
    ).toBe(true);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: { Accept: "text/markdown, text/html" },
        }),
      ),
    ).toBe(false);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: { Accept: "application/json" },
        }),
      ),
    ).toBe(false);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: {
            Accept:
              "invalid, text/markdown;q=not-a-number, text/*;q=0.3, text/html;q=0.4",
          },
        }),
      ),
    ).toBe(false);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: {
            Accept: "text/*;q=1, text/markdown;q=0.9, text/html;q=0.8",
          },
        }),
      ),
    ).toBe(true);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: { Accept: "text/markdown;q=0, */*;q=1" },
        }),
      ),
    ).toBe(false);
  });

  it("does not negotiate POST requests", () => {
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          headers: { Accept: "application/json" },
        }),
      ),
    ).toBe(false);
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/", {
          method: "POST",
          headers: { Accept: "text/markdown" },
        }),
      ),
    ).toBe(false);
  });

  it("maps routes to page and nested-index Markdown mirrors", () => {
    expect(markdownAssetPaths(new URL("https://cva.style/"))).toEqual([
      "/index.md",
    ]);
    expect(markdownAssetPaths(new URL("https://cva.style/beta/"))).toEqual([
      "/beta.md",
      "/beta/index.md",
    ]);
    expect(markdownAssetPaths(new URL("https://cva.style/beta"))).toEqual([
      "/beta.md",
      "/beta/index.md",
    ]);
    expect(
      markdownAssetPaths(new URL("https://cva.style/guides/release-notes.v2/")),
    ).toEqual([
      "/guides/release-notes.v2.md",
      "/guides/release-notes.v2/index.md",
    ]);
    expect(markdownAssetPaths(new URL("https://cva.style/index.md"))).toEqual(
      [],
    );
  });

  it("preserves method and request data for mirror assets", () => {
    const request = new Request("https://cva.style/beta/", {
      method: "HEAD",
      headers: { "If-None-Match": '"mirror"' },
    });
    const mirrors = markdownAssetRequests(request);

    expect(mirrors).toHaveLength(2);
    expect(mirrors[0]?.method).toBe("HEAD");
    expect(mirrors[0]?.url).toBe("https://cva.style/beta.md");
    expect(mirrors[1]?.url).toBe("https://cva.style/beta/index.md");
    expect(mirrors[1]?.headers.get("If-None-Match")).toBe('"mirror"');
    expect(
      markdownAssetRequests(new Request("https://cva.style/index.md")),
    ).toEqual([]);
  });

  it("preserves response metadata while adding the Markdown cache variation", () => {
    const response = new Response(null, {
      status: 304,
      statusText: "Not Modified",
      headers: { ETag: '"mirror"', Vary: "Accept-Encoding" },
    });
    const markdown = markdownResponse(response, "GET");

    expect(markdown.status).toBe(304);
    expect(markdown.statusText).toBe("Not Modified");
    expect(markdown.headers.get("ETag")).toBe('"mirror"');
    expect(markdown.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(markdown.headers.get("Vary")).toBe("Accept-Encoding, Accept");
    expect(withAcceptVary(markdown).headers.get("Vary")).toBe(
      "Accept-Encoding, Accept",
    );

    const head = markdownResponse(new Response("body"), "HEAD");
    expect(head.body).toBeNull();
    expect(withAcceptVary(new Response("body")).headers.get("Vary")).toBe(
      "Accept",
    );
  });

  it("identifies only HTML asset responses for negotiation cache variation", () => {
    expect(
      isHtmlResponse(
        new Response(null, { headers: { "Content-Type": "text/html" } }),
      ),
    ).toBe(true);
    expect(
      isHtmlResponse(
        new Response(null, {
          status: 304,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    ).toBe(true);
    expect(
      isHtmlResponse(
        new Response(null, { headers: { "Content-Type": "text/plain" } }),
      ),
    ).toBe(false);
    expect(isHtmlResponse(new Response(null))).toBe(false);
  });
});
