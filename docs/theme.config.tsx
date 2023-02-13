import { useConfig, type DocsThemeConfig } from "nextra-theme-docs";
import { useRouter } from "next/router";

const config: DocsThemeConfig = {
  logo: "cva",
  project: {
    link: "https://github.com/joe-bell/cva",
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
