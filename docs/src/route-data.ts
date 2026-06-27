import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// Make the header logo/title link version-aware: on the beta docs it points to
// the beta home (`/beta/`), otherwise the stable home (`/`, Starlight's default).
export const onRequest = defineRouteMiddleware((context) => {
  if (context.url.pathname.startsWith("/beta")) {
    context.locals.starlightRoute.siteTitleHref = "/beta/";
  }
});
