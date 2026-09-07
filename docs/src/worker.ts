import {
  acceptsMarkdown,
  markdownAssetRequests,
  markdownResponse,
  isHtmlResponse,
  withAcceptVary,
} from "./worker/negotiate";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith(".md")) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 200 || response.status === 304) {
        return markdownResponse(response, request.method);
      }
      return response;
    }

    if (acceptsMarkdown(request)) {
      for (const markdownRequest of markdownAssetRequests(request)) {
        const response = await env.ASSETS.fetch(markdownRequest);
        if (response.status === 200 || response.status === 304) {
          return markdownResponse(response, request.method);
        }
      }
    }

    const response = await env.ASSETS.fetch(request);
    return (response.status === 200 || response.status === 304) &&
      isHtmlResponse(response)
      ? withAcceptVary(response)
      : response;
  },
};
