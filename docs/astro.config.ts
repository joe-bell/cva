import { defineConfig, fontProviders } from "astro/config";
import starlight from "@astrojs/starlight";
import cloudflare from "@astrojs/cloudflare";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightVersions from "starlight-versions";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import { orderRedirects } from "./src/integrations/order-redirects";
import {
  assertVersionRedirects,
  versionPageRedirects,
} from "./src/integrations/version-redirects";

const site = "https://cva.style";
const googleAnalyticsId = "G-E8Z8HL9WXF";

const config = {
  title: "cva",
  favicon: "/assets/img/favicon.png",
  editLink: {
    baseUrl: "https://github.com/joe-bell/cva/tree/main/docs/",
  },
};

const versions = [{ slug: "beta", label: "Beta" }] as const;

const docsDir = new URL("./src/content/docs/", import.meta.url);
const versionSlugs = versions.map(({ slug }) => slug);

const versionRedirects = Object.fromEntries(
  versions.flatMap(({ slug }) => [
    [`/${slug}/sponsors`, "/sponsors"],
    [`/${slug}/llms.txt`, "/llms.txt"],
  ]),
);

export default defineConfig({
  site,
  output: "static",
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "node",
  }),
  redirects: {
    "/sponsors": "https://joebell.studio/sponsors",
    // Preserve inbound links from the previous Nextra docs, which served pages
    // under `/docs/*`.
    // Note: the `/docs/*` catch-all is defined in `public/_redirects`; a
    // spread redirect here would compile to an `/index.html` target which
    // Cloudflare rejects as a loop.
    "/docs": "/",
    ...versionRedirects,
    // Gracefully redirect pages that exist in some versions but not others to
    // the relevant version home, so switching versions never lands on a 404.
    ...versionPageRedirects(docsDir, versionSlugs),
  },
  markdown: {
    processor: satteri({ features: { smartPunctuation: true } }),
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Inter",
      cssVariable: "--font-inter",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/inter-var-latin.woff2"],
            display: "optional",
            unicodeRange: [
              "U+0000-00FF",
              "U+0131",
              "U+0152-0153",
              "U+02BB-02BC",
              "U+02C6",
              "U+02DA",
              "U+02DC",
              "U+2000-206F",
              "U+2074",
              "U+20AC",
              "U+2122",
              "U+2191",
              "U+2193",
              "U+2212",
              "U+2215",
              "U+FEFF",
              "U+FFFD",
            ],
          },
        ],
      },
    },
  ],
  integrations: [
    starlight({
      ...config,
      routeMiddleware: "./src/route-data.ts",
      components: {
        Head: "./src/components/head.astro",
        SiteTitle: "./src/components/site-title.astro",
      },
      description: "Class Variance Authority",
      credits: false,
      logo: { src: "./src/assets/logo.svg", replacesTitle: true },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/joe-bell/cva",
        },
        {
          icon: "x.com",
          label: "X",
          href: "https://joebell.studio/x",
        },
        {
          icon: "blueSky",
          label: "Bluesky",
          href: "https://joebell.studio/bluesky",
        },
      ],
      tagline: "Class Variance Authority",
      // Sidebar for the current (stable) version.
      // Each archived version (e.g. `beta`) defines its own sidebar in
      // `src/content/versions/*.json`.
      sidebar: [
        {
          label: "Introduction",
          link: "/",
        },
        {
          label: "Getting Started",
          items: [
            { label: "Installation", link: "/getting-started/installation" },
            { label: "Variants", link: "/getting-started/variants" },
            { label: "TypeScript", link: "/getting-started/typescript" },
            {
              label: "Extending Components",
              link: "/getting-started/extending-components",
            },
            {
              label: "Composing Components",
              link: "/getting-started/composing-components",
            },
          ],
        },
        {
          label: "Examples",
          items: [
            {
              label: "11ty",
              link: "/examples/11ty",
            },
            {
              label: "Astro",
              link: "/examples/astro",
            },
            {
              label: "BEM",
              link: "/examples/bem",
            },
            {
              label: "React",
              items: [
                { label: "CSS Modules", link: "/examples/react/css-modules" },
                { label: "Tailwind CSS", link: "/examples/react/tailwind-css" },
              ],
            },
            {
              label: "Svelte",
              link: "/examples/svelte",
            },
            {
              label: "Vue",
              link: "/examples/vue",
            },
            {
              label: "Other Use Cases",
              link: "/examples/other-use-cases",
            },
          ],
        },
        {
          label: "API Reference",
          link: "/api-reference",
        },
        {
          label: "Tutorials",
          link: "/tutorials",
        },
        {
          label: "FAQs",
          link: "/faqs",
        },
        {
          label: "Sponsor",
          link: "/sponsors",
          attrs: {
            target: "_blank",
          },
        },
        {
          label: "llms.txt",
          link: "/llms.txt",
        },
      ],
      plugins: [
        starlightLlmsTxt({
          exclude: versions.map((version) => `${version.slug}/**`),
          customSets: versions.map((version) => ({
            label: `cva@${version.slug}`,
            description: `Documentation for the cva@${version.slug} release (https://cva.style/${version.slug})`,
            paths: [`${version.slug}/**`],
          })),
        }),
        starlightVersions({
          current: { label: "Latest" },
          versions: versions.map((version) => ({
            slug: version.slug,
            label: version.label,
          })),
        }),
      ],
      customCss: ["./src/styles/main.css"],
      head: [
        // Open Graph
        {
          tag: "meta",
          attrs: { property: "og:title", content: config.title },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: new URL("/assets/img/og.png", site).toString(),
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content:
              "Interweaving circle, upside-down triangle and triangle: forming the letters CVA",
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:type", content: "image/png" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:width", content: "1280" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:height", content: "640" },
        },
        // iOS
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", content: config.favicon },
        },
        {
          tag: "meta",
          attrs: { name: "apple-mobile-web-app-title", content: config.title },
        },
        // Misc
        // Override Starlight's auto `twitter:site`, which it derives from the
        // X social link's path (`joebell.studio/x` → `@x`).
        {
          tag: "meta",
          attrs: { name: "twitter:site", content: "@joebell_" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:creator", content: "@joebell_" },
        },
        // Analytics
        {
          tag: "script",
          attrs: {
            src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
            async: true,
          },
        },
        {
          tag: "script",
          content: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `,
        },
      ],
    }),
    orderRedirects(),
    assertVersionRedirects(docsDir, versionSlugs),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
