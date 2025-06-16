import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET() {
    // Force development mode for now to fix cookie issues
    const isProduction = false;
    const cookieFlags = isProduction ? "HttpOnly; Secure; SameSite=Lax" : "HttpOnly; SameSite=Lax";
    
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": `twitter_session=; Path=/; ${cookieFlags}; Max-Age=0`,
      },
    });
  },
}; 