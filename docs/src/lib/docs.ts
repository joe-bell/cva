import type { InferGetStaticPropsType } from "astro";
import { getCollection } from "astro:content";
import { compareVersions } from "compare-versions";
import { config } from "@/config";

export const COLLECTION = "docs";

export const getDocsVersionFromPathname = (pathname: string) => {
  const pathnameToId = pathname
    .split("/")
    // remove collection from path
    .filter((seg, i) => i !== 0 && seg !== COLLECTION)
    .join("/")
    // remove trailing/leading slashes
    .replace(/^\/+|\/+$/g, "");

  return getVersionFromId(pathnameToId);
};

const getVersionFromId = (id: string) => {
  const segments = id.split("/");

  const [dir] = segments;

  if (dir && (config.npm.distTags.includes(dir) || dir.match(/v(?=\d)/)))
    return dir;

  return config.npm.latest.version;
};

export const getDocs = async () => {
  const entries = await getCollection(COLLECTION);

  const allVersions = [
    ...new Set(
      entries
        .map((entry) => getVersionFromId(entry.id))
        .flatMap((version) => (version ? [version] : []))
    ),
  ];

  const versions = {
    latest: config.npm.latest.version,
    stable: [
      ...allVersions
        .filter((version) => version?.startsWith("v"))
        .sort((a, b) => compareVersions(b, a)),
    ],
    experimental: allVersions.filter((version) => !version?.startsWith("v")),
  };

  const content = entries.map((entry) => {
    // astro strips periods from semver slugs, but I'd like to have them
    const slug = entry.slug
      .split("/")
      .map((segment, i) =>
        i === 0
          ? allVersions.reduce(
              (acc, cv) => ({ ...acc, [cv.replaceAll(".", "")]: cv }),
              {} as Record<string, string>
            )[segment] || segment
          : segment
      )
      .join("/");

    return {
      ...entry,
      slug,
      version: getVersionFromId(entry.id),
    };
  });

  return {
    content,
    versions,
  };
};
