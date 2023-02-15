import { useConfig, type DocsThemeConfig } from "nextra-theme-docs";
import { useRouter } from "next/router";

export const config = {
  title: "cva",
  branch: "main",
  repo: "joe-bell/cva",
  domain: "cva.style",
  description: "Class Variance Authority",
  author: {
    name: "Joe Bell",
    url: "https://joebell.co.uk",
    twitter: "joebell_",
  },
  og: "/assets/img/og.png",
  favicon: "/assets/img/favicon.png",
};

const PROJECT = `https://github.com/${config.repo}`;
const SITE = `https://${config.domain}`;
const TWITTER = `https://twitter.com/${config.author.twitter}`;

const nextraConfig: DocsThemeConfig = {
  chat: {
    link: TWITTER,
    icon: (
      <svg width="24" height="24" viewBox="0 0 248 204">
        <path
          fill="currentColor"
          d="M221.95 51.29c.15 2.17.15 4.34.15 6.53 0 66.73-50.8 143.69-143.69 143.69v-.04c-27.44.04-54.31-7.82-77.41-22.64 3.99.48 8 .72 12.02.73 22.74.02 44.83-7.61 62.72-21.66-21.61-.41-40.56-14.5-47.18-35.07a50.338 50.338 0 0 0 22.8-.87C27.8 117.2 10.85 96.5 10.85 72.46v-.64a50.18 50.18 0 0 0 22.92 6.32C11.58 63.31 4.74 33.79 18.14 10.71a143.333 143.333 0 0 0 104.08 52.76 50.532 50.532 0 0 1 14.61-48.25c20.34-19.12 52.33-18.14 71.45 2.19 11.31-2.23 22.15-6.38 32.07-12.26a50.69 50.69 0 0 1-22.2 27.93c10.01-1.18 19.79-3.86 29-7.95a102.594 102.594 0 0 1-25.2 26.16z"
        />
      </svg>
    ),
  },
  docsRepositoryBase: `${PROJECT}/tree/${config.branch}/docs`,
  logo: (
    <>
      <svg
        className="logo"
        viewBox="0 0 1160 780"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: 42 }}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M389.95 485.246C467.692 440.298 520 356.258 520 260L710 260L560 520H710L560 780L389.95 485.246ZM389.95 485.246C351.718 507.35 307.336 520 260 520C116.406 520 0 403.594 0 260C0 116.406 116.406 0 260 0C403.594 0 520 116.406 520 260L260 260L389.95 485.246ZM710 520H1160L860 0L710 260L860 260L710 520Z"
          fill="url(#paint0_linear_101_10)"
        />
        <defs>
          <linearGradient
            id="paint0_linear_101_10"
            x1="580"
            y1="0"
            x2="580"
            y2="780"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.145833" stopColor="white" />
            <stop offset="0.822917" stopColor="currentColor" />
          </linearGradient>
        </defs>
      </svg>
      <span className="sr-only">
        {config.title.toUpperCase()} ({config.description})
      </span>
    </>
  ),
  project: {
    link: PROJECT,
  },
  footer: {
    text: (
      <span>
        <a href={`${PROJECT}/tree/${config.branch}/LICENSE`} target="_blank">
          Apache-2.0 {new Date().getFullYear()}
        </a>{" "}
        ©{" "}
        <a href={config.author.url} target="_blank">
          {config.author.name}
        </a>
      </span>
    ),
  },
  feedback: {
    useLink() {
      const config = useConfig();

      return `${
        config.project.link
      }/discussions/new?category=feedback&title=${encodeURIComponent(
        `Feedback for "${config.title}"`
      )}`;
    },
  },
  head: () => {
    const { asPath } = useRouter();
    const { frontMatter } = useConfig();

    const canonical = new URL(asPath, SITE).toString();

    return (
      <>
        <meta property="og:url" content={canonical} />
        <link rel="canonical" href={canonical} />

        <meta
          name="description"
          content={frontMatter.description || config.description}
        />
        <meta
          property="og:description"
          content={frontMatter.description || config.description}
        />
        <meta name="twitter:site" content={`@${config.author.twitter}`} />
        <meta name="twitter:creator" content={`@${config.author.twitter}`} />
        <meta name="twitter:card" content="summary_large_image" />

        <link rel="shortcut icon" href={config.favicon} />
        <link rel="apple-touch-icon" href={config.favicon} />
        <meta name="apple-mobile-web-app-title" content={config.title} />
      </>
    );
  },
  sidebar: {
    toggleButton: true,
  },
  useNextSeoProps() {
    const { asPath } = useRouter();

    const shared = {
      openGraph: {
        images: [
          {
            url: new URL(config.og, SITE).toString(),
            width: 1280,
            height: 640,
            alt: `Interweaving circle, upside-down triangle and triangle: forming the letters ${config.title.toUpperCase()}`,
            type: "image/png",
          },
        ],
      },
    };

    if (asPath === "/") {
      return { ...shared, title: config.title };
    }

    return { ...shared, titleTemplate: `%s | ${config.title}` };
  },
};

export default nextraConfig;
