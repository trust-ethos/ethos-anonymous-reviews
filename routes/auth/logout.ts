import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET() {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": "twitter_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      },
    });
  },
}; 