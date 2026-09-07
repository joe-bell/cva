import { markdownPathsFromRoutePath } from "../lib/docs-routes";

function qualityFor(mediaType: string, accepted: string) {
  const [type, subtype] = mediaType.split("/");
  let match: { quality: number; specificity: number } | undefined;

  for (const item of accepted.split(",")) {
    const [range, ...parameters] = item.trim().toLowerCase().split(";");
    const [acceptedType, acceptedSubtype] = range!.trim().split("/");
    if (!acceptedType || !acceptedSubtype) continue;
    if (
      (acceptedType !== "*" && acceptedType !== type) ||
      (acceptedSubtype !== "*" && acceptedSubtype !== subtype)
    ) {
      continue;
    }

    const qualityParameter = parameters.find((parameter) =>
      parameter.trim().startsWith("q="),
    );
    const quality = qualityParameter
      ? Number(qualityParameter.trim().slice(2))
      : 1;
    if (!Number.isFinite(quality) || quality < 0 || quality > 1) continue;

    const specificity =
      Number(acceptedType !== "*") + Number(acceptedSubtype !== "*");
    if (!match || specificity > match.specificity) {
      match = { quality, specificity };
    }
  }

  return match?.quality ?? 0;
}

export function acceptsMarkdown(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  const accepted = request.headers.get("Accept");
  if (!accepted) return false;

  const markdown = qualityFor("text/markdown", accepted);
  const html = qualityFor("text/html", accepted);
  return markdown > 0 && markdown > html;
}

export function markdownAssetPaths(url: URL) {
  return markdownPathsFromRoutePath(url.pathname);
}

export function markdownAssetRequests(request: Request) {
  const url = new URL(request.url);
  return markdownAssetPaths(url).map((path) => {
    const assetUrl = new URL(url);
    assetUrl.pathname = path;
    return new Request(assetUrl, request);
  });
}

export function withAcceptVary(response: Response) {
  const headers = new Headers(response.headers);
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  if (!values.includes("accept")) headers.append("Vary", "Accept");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isHtmlResponse(response: Response) {
  return response.headers.get("Content-Type")?.startsWith("text/html") ?? false;
}

export function markdownResponse(response: Response, method: string) {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  return withAcceptVary(
    new Response(method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  );
}
