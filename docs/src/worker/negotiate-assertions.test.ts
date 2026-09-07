import { describe, expect, it } from "vitest";

import { acceptsMarkdown, markdownResponse } from "./negotiate";

describe("Markdown negotiation method semantics", () => {
  it("accepts a HEAD request that explicitly prefers Markdown", () => {
    expect(
      acceptsMarkdown(
        new Request("https://cva.style/beta/", {
          method: "HEAD",
          headers: { Accept: "text/markdown;q=1, text/html;q=0.5" },
        }),
      ),
    ).toBe(true);
  });

  it("preserves a GET response body while returning a null body for HEAD", async () => {
    const get = markdownResponse(new Response("# beta"), "GET");
    const head = markdownResponse(new Response("# beta"), "HEAD");

    await expect(get.text()).resolves.toBe("# beta");
    expect(head.body).toBeNull();
    expect(head.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
  });
});
