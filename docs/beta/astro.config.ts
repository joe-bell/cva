import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/static";

const site = "https://beta.cva.style";
const googleAnalyticsId = "G-E8Z8HL9WXF";

const config = {
  title: "cva@beta",
  favicon: "/assets/img/favicon.png",
  editLink: {
    baseUrl: "https://github.com/joe-bell/cva/tree/main/docs/beta/",
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  output: "static",
  adapter: vercel({ analytics: false }),
  integrations: [
    starlight({
      ...config,
      description: "Class Variance Authority",
      credits: false,
      logo: { src: "./src/assets/logo.svg", replacesTitle: true },
      social: {
        github: "https://github.com/joe-bell/cva",
        "x.com": "https://joebell.co.uk/x",
        threads: "https://joebell.co.uk/threads",
      },
      tagline: "Class Variance Authority",
      sidebar: [
        {
          label: "Introduction",
          link: "/",
        },
        {
          label: "Getting Started",
          items: [
            { label: "What's New?", link: "/getting-started/whats-new" },
            { label: "Installation", link: "/getting-started/installation" },
            { label: "Variants", link: "/getting-started/variants" },
            {
              label: "Extending Components",
              link: "/getting-started/extending-components",
            },
            {
              label: "Composing Components",
              link: "/getting-started/composing-components",
            },
            { label: "TypeScript", link: "/getting-started/typescript" },
          ],
        },
        {
          label: "Examples ↗",
          link: "https://cva.style/docs/examples/astro",
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
          label: "FAQs ↗",
          link: "https://cva.style/docs/faqs",
        },
        {
          label: "Sponsor ♡",
          link: "https://polar.sh/cva",
          attrs: {
            target: "_blank",
          },
        },
      ],
      customCss: ["./src/styles/main.css"],
      head: [
        // Fonts
        {
          tag: "link",
          attrs: {
            rel: "preload",
            href: "/assets/fonts/inter-var-latin.woff2",
            as: "font",
            type: "font/woff2",
            crossorigin: "anonymous",
          },
        },
        // !@TODO
        // Remove `robots` before stable release
        {
          tag: "meta",
          attrs: { name: "robots", content: "noindex,nofollow" },
        },
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
    tailwind({ applyBaseStyles: false }),
  ],
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
});
