import { defineConfig, fontProviders } from "astro/config";
import starlight from "@astrojs/starlight";
import vercel from "@astrojs/vercel";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightVersions from "starlight-versions";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";

const site = "https://cva.style";
const googleAnalyticsId = "G-E8Z8HL9WXF";

// Single source of truth for the sponsors link, surfaced as a `/sponsors`
// redirect so sidebars can link to `/sponsors` instead of hard-coding the URL.
const sponsorsUrl = "https://joebell.studio/sponsors";

const config = {
  title: "cva",
  favicon: "/assets/img/favicon.png",
  editLink: {
    baseUrl: "https://github.com/joe-bell/cva/tree/main/docs/beta/",
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  output: "static",
  adapter: vercel(),
  redirects: {
    // Preserve inbound links from the previous Nextra docs, which served pages
    // under `/docs/*`.
    "/docs": "/",
    "/docs/[...slug]": "/[...slug]",
    // Sponsors redirect (single source of truth). The versions plugin rewrites
    // the beta sidebar's `/sponsors` to `/beta/sponsors`, so redirect both.
    "/sponsors": sponsorsUrl,
    "/beta/sponsors": sponsorsUrl,
    // The beta sidebar links to `/llms.txt`; the versions plugin rewrites it to
    // `/beta/llms.txt`, so point that back at the root llms index.
    "/beta/llms.txt": "/llms.txt",
  },
  markdown: {
    // Astro's Sätteri processor with smart punctuation (curly quotes, dashes…).
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
          // Keep the versioned beta docs out of the current (stable) llms sets;
          // they're surfaced separately via the `cva@beta` custom set below and
          // linked from the /llms.txt index. Note: llms-full.txt always
          // includes every page regardless of `exclude` (the "complete" set).
          exclude: ["beta/**"],
          customSets: [
            {
              label: "cva@beta",
              description:
                "Documentation for the cva@beta release (https://cva.style/beta)",
              paths: ["beta/**"],
            },
          ],
        }),
        starlightVersions({
          current: { label: "Latest" },
          versions: [{ slug: "beta", label: "Beta" }],
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
  ],
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
