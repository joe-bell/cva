import { useConfig, type DocsThemeConfig } from "nextra-theme-docs";
import { useRouter } from "next/router";

export const config = {
  title: "cva",
  domain: "cva.style",
  description: "Class Variance Authority",
  author: {
    name: "Joe Bell",
    url: "https://joebell.co.uk",
    twitter: "joebell_",
  },
  og: "/assets/img/og.png",
  favicon: "/assets/img/favicon.png",
  branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || "main",
  repo: [
    process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER || "joe-bell",
    process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG || "cva",
  ].join("/"),
} as const;

export const PROJECT = `https://github.com/${config.repo}`;
export const SITE = `https://${config.domain}`;

const nextraConfig: DocsThemeConfig = {
  chat: {
    link: "https://joebell.studio/bluesky",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        version="1.1"
        viewBox="0 0 600 530"
      >
        <path
          d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  docsRepositoryBase: `${PROJECT}/tree/${config.branch}/docs/latest`,
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
  banner: {
    key: "1.0-beta",
    text: (
      <span>
        <a href="https://beta.cva.style" target="_blank">
          🎉 cva@1.0 is now in beta. See the updated docs →
        </a>
      </span>
    ),
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
        `Feedback for "${config.title}"`,
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

    if (["/", "/docs"].includes(asPath)) {
      return { ...shared, titleTemplate: config.title };
    }

    return { ...shared, titleTemplate: `%s | ${config.title}` };
  },
};

export default nextraConfig;
