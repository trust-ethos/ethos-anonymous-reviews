import type { FreshContext } from "$fresh/server.ts";

// One year. Tells browsers to reach this site over HTTPS only, so a session
// cookie is never sent over plain HTTP after the first visit.
const HSTS_HEADER = "Strict-Transport-Security";
const HSTS_VALUE = "max-age=31536000";

/** Adds the HSTS header to every response: pages, API routes and static files. */
export async function handler(
  _req: Request,
  ctx: Pick<FreshContext, "next">,
): Promise<Response> {
  const response = await ctx.next();
  try {
    response.headers.set(HSTS_HEADER, HSTS_VALUE);
    return response;
  } catch {
    // Some responses (Response.redirect(), a passed-through fetch) have
    // read-only headers: copy the response so the header can still be set.
    const copy = new Response(response.body, response);
    copy.headers.set(HSTS_HEADER, HSTS_VALUE);
    return copy;
  }
}
