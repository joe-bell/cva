import { describe, expect, it } from "vitest";

import { htmlToMarkdown } from "./html-to-markdown";

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
