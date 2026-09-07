/** Convert a docs collection ID into the public Markdown mirror URL. */
export function markdownPathFromEntryId(id: string) {
  const path = id.replace(/\.(?:md|mdx)$/, "");
  if (!path) return "/index.md";
  if (path === "beta") return "/beta/index.md";
  return `/${path}.md`;
}

/** Convert a public HTML path into its possible generated Markdown asset paths. */
export function markdownPathsFromRoutePath(pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  if (!path) return ["/index.md"];
  if (path.endsWith(".md")) return [];

  return [`${path}.md`, `${path}/index.md`];
}
