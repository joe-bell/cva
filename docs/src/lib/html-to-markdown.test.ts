import { htmlToMarkdown, renderedDocContent } from "./html-to-markdown";
import { describe, expect, it } from "vitest";

describe("htmlToMarkdown", () => {
  it("preserves rendered tabs and code while excluding embeds", async () => {
    const markdown = await htmlToMarkdown(
      `<starlight-tabs>
				<button role="tab"><span>Type</span>Script<!-- label comment --></button>
				<div role="tabpanel"><div class="expressive-code"><pre data-language="ts"><code class="existing">const value = true;</code></pre></div></div>
			</starlight-tabs>
			<div class="expressive-code"><pre data-language="js"><code>const other = true;</code></pre></div>
			<div class="expressive-code"><pre><code>plain code</code></pre></div>
			<iframe src="https://example.com/embed"></iframe>
			<a class="sl-anchor-link" href="#kept-heading">Permalink</a>
			<a href="/examples/react">Example</a>
			<img src="/_astro/logo.svg" alt="CVA">`,
      new URL("https://cva.style"),
    );

    expect(markdown).toContain("TypeScript");
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("const value = true;");
    expect(markdown).not.toContain("iframe");
    expect(markdown).not.toContain("Permalink");
    expect(markdown).toContain("[Example](https://cva.style/examples/react)");
    expect(markdown).toContain("https://cva.style/_astro/logo.svg");
  });

  it("resolves page-relative URLs while retaining fragment and mail links", async () => {
    const markdown = await htmlToMarkdown(
      `<a href="./next">Next</a>
			<img src="../image.png" alt="Image">
			<a href="#details">Details</a>
			<a href="mailto:hello@example.com">Email</a>`,
      new URL("https://cva.style/guides/current/"),
    );

    expect(markdown).toContain("https://cva.style/guides/current/next");
    expect(markdown).toContain("https://cva.style/guides/image.png");
    expect(markdown).toContain("[Details](#details)");
    expect(markdown).toContain("[Email](mailto:hello@example.com)");
  });
});

describe("renderedDocContent", () => {
  it("selects rendered document content rather than page chrome", () => {
    const content = renderedDocContent(`<!doctype html><html><body>
			<nav>Navigation</nav>
			<main><div class="sl-markdown-content"><h1>Rendered title</h1><p>Body</p></div></main>
			<footer>Footer</footer>
		</body></html>`);

    expect(content).toContain("Rendered title");
    expect(content).not.toContain("Navigation");
    expect(content).not.toContain("Footer");
  });

  it("rejects a rendered page without document content", () => {
    expect(() => renderedDocContent("<main>Missing content</main>")).toThrow(
      "Could not find rendered Starlight document content.",
    );
  });
});

describe("htmlToMarkdown exact rendered structures", () => {
  it("renders TypeScript, JavaScript, and unlabelled fenced code with their content", async () => {
    const markdown = await htmlToMarkdown(
      `<div class="expressive-code"><pre data-language="ts"><code>const typed: boolean = true;</code></pre></div>
      <div class="expressive-code"><pre data-language="js"><code>const javascript = true;</code></pre></div>
      <div class="expressive-code"><pre><code>plain code</code></pre></div>`,
      new URL("https://cva.style/"),
    );

    expect(markdown).toBe(
      "```ts\nconst typed: boolean = true;\n```\n\n```js\nconst javascript = true;\n```\n\n```\nplain code\n```",
    );
  });

  it("pairs tabs and panels in source order and omits screen-reader-only text", async () => {
    const markdown = await htmlToMarkdown(
      `<starlight-tabs>
        <button role="tab"><span>Type</span>Script</button>
        <button role="tab">JavaScript</button>
        <div role="tabpanel"><p>type content</p></div>
        <div role="tabpanel"><p>javascript content</p></div>
      </starlight-tabs>
      <span class="sr-only">This must not appear</span>`,
      new URL("https://cva.style/"),
    );

    expect(markdown).toBe(
      "* TypeScript\n\n  type content\n\n* JavaScript\n\n  javascript content",
    );
    expect(markdown).not.toContain("This must not appear");
  });
});
