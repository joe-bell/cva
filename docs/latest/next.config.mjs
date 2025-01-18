import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  staticImage: true,
});

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/docs",
        permanent: false,
      },
    ];
  },
};

export default withNextra(nextConfig);
