import cva from "class-variance-authority/package.json";

const author = "Joe Bell";
const title = "cva";
const description = "Class Variance Authority";

const domain = "cva.style";
const site = `https://${domain}`;
const year = new Date().getFullYear();

export const config = {
  title,
  author,
  domain,
  site,
  npm: {
    latest: { version: `v${cva.version}` },
    distTags: ["stable", "beta", "alpha", "canary"],
  },
  copyright: `© ${year} ${author}`,
  year,
  license: "https://github.com/joe-bell/cva/blob/main/LICENSE",
  description,
  twitter: "joebell_",
};
