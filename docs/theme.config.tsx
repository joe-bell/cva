import { useConfig, type DocsThemeConfig } from "nextra-theme-docs";
import { useRouter } from "next/router";

const config: DocsThemeConfig = {
  logo: "cva",
  project: {
    link: "https://github.com/joe-bell/cva",
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
  docsRepositoryBase: "https://github.com/joe-bell/cva/tree/main/docs",
  head: function useHead() {
    const { title } = useConfig();
    const { route } = useRouter();

    return (
      <>
        <meta name="theme-color" content="#fff" />
      </>
    );
  },
};

export default config;
