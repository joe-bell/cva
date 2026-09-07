import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { markdownPathFromEntryId } from "./lib/docs-routes";

// Make the header logo/title link version-aware: on the beta docs it points to
// the beta home (`/beta/`), otherwise the stable home (`/`, Starlight's default).
export const onRequest = defineRouteMiddleware((context) => {
  const { entry, head } = context.locals.starlightRoute;
  if (context.url.pathname.startsWith("/beta")) {
    context.locals.starlightRoute.siteTitleHref = "/beta/";
  }

  if (!entry.data.draft && entry.id !== "404" && !entry.id.endsWith("/404")) {
    head.push({
      tag: "link",
      attrs: {
        rel: "alternate",
        type: "text/markdown",
        href: markdownPathFromEntryId(entry.id),
      },
    });
  }
});
