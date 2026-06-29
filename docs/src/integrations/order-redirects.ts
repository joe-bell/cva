import { readFile, writeFile } from "node:fs/promises";
import type { AstroIntegration } from "astro";

/**
 * Cloudflare evaluates `_redirects` top-to-bottom and warns (in the build log)
 * that static rules placed *below* a line containing a splat (`*`) or
 * placeholder (`:name`) "could be made more performant by bringing it above"
 * those lines.
 *
 * The `@astrojs/cloudflare` adapter always *appends* the redirects generated
 * from `astro.config.ts`'s `redirects` to the existing `public/_redirects`, so
 * our `/docs/*` splat (which has to live in `public/_redirects` — see the note
 * in `astro.config.ts`) ends up first, pushing every static rule below it.
 *
 * This integration runs after the adapter has written the final file and
 * stable-sorts it so all static rules come first and splat/placeholder rules
 * come last, silencing the warnings without changing matching behaviour
 * (static rules are exact, so they never overlap the splat).
 */
const isDynamicRule = (line: string): boolean => {
  const pattern = line.trim().split(/\s+/)[0] ?? "";
  // Cloudflare treats `*` as a splat and `:name` segments as placeholders.
  return pattern.includes("*") || /(^|\/):[^/]+/.test(pattern);
};

export const orderRedirects = (): AstroIntegration => ({
  name: "order-redirects",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const redirectsUrl = new URL("./_redirects", dir);

      let contents: string;
      try {
        contents = await readFile(redirectsUrl, "utf-8");
      } catch {
        // No `_redirects` emitted (e.g. nothing to redirect) — nothing to do.
        return;
      }

      const rules = contents.split("\n").filter((line) => line.trim() !== "");
      const ordered = [
        ...rules.filter((line) => !isDynamicRule(line)),
        ...rules.filter(isDynamicRule),
      ];

      if (ordered.join("\n") !== rules.join("\n")) {
        await writeFile(redirectsUrl, `${ordered.join("\n")}\n`);
        logger.info(
          "Reordered _redirects so static rules precede splat/placeholder rules.",
        );
      }

      // `ordered` is what the file now holds: a static rule after the first
      // splat/placeholder would re-trigger the warnings this reordering silences.
      const firstDynamic = ordered.findIndex(isDynamicRule);
      if (
        firstDynamic !== -1 &&
        ordered.slice(firstDynamic).some((line) => !isDynamicRule(line))
      ) {
        throw new Error(
          "_redirects has a static rule after a splat/placeholder.",
        );
      }
    },
  },
});
