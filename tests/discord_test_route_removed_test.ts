// The app once had an unauthenticated route that posted a fake review to the
// team's Discord webhook for anyone who called it. It was deleted; this keeps
// it out of the Fresh route manifest.
//
// Runs under a bare `deno test` with no permissions: the manifest is imported
// as text, as tests/log_privacy_test.ts does.
import { assert, assertEquals } from "$std/assert/mod.ts";
import manifestSource from "../fresh.gen.ts" with { type: "text" };

// Joined at run time so that a search of the repo for the old path finds
// nothing, this file included.
const REMOVED_ROUTE = ["", "api", "discord", "test"].join("/");

/** URL paths of every route file the manifest lists, without extension. */
function manifestRoutes(source: string): string[] {
  return [...source.matchAll(/"\.\/routes(\/[^"]+?)\.tsx?"\s*:/g)]
    .map(([, path]) => path);
}

Deno.test("the route manifest has no Discord test route", () => {
  const routes = manifestRoutes(manifestSource);
  assert(routes.includes("/index"), "no routes were read from fresh.gen.ts");
  assertEquals(
    routes.filter((route) =>
      route === REMOVED_ROUTE || route.startsWith(REMOVED_ROUTE + "/")
    ),
    [],
  );
  assert(
    !manifestSource.includes(REMOVED_ROUTE),
    "fresh.gen.ts still mentions the removed route",
  );
});
