import { Handlers } from "$fresh/server.ts";
import { verifySecureSession, validateCSRFToken, validateAndConsumeNonce, checkRateLimit, validateOrigin, validateReviewContent } from "../../../utils/security.ts";
import { sendSlashNotification } from "../../../utils/discord.ts";

interface SubmitSlashRequest {
  profileId: number;
  profileUsername: string;
  title: string;
  description: string;
  csrfToken: string;
  requestNonce: string;
  reviewerReputationLevel?: string;
}

export const handler: Handlers = {
  async POST(req) {
    console.log("🔥 Slash request received");

    try {
      // 1. Validate request origin
      if (!validateOrigin(req)) {
        console.log("❌ Invalid request origin");
        return new Response(JSON.stringify({ error: "Invalid request origin" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Parse request body
      let body: SubmitSlashRequest;
      try {
        body = await req.json();
      } catch (error) {
        console.log("❌ Invalid JSON in request body:", error);
        return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("📝 Slash request data:", {
        profileUsername: body.profileUsername,
        title: body.title,
        hasDescription: !!body.description,
        hasCSRF: !!body.csrfToken,
        hasNonce: !!body.requestNonce
      });

      // 3. Validate required fields
      if (!body.profileId || !body.profileUsername || !body.title || !body.description || !body.csrfToken || !body.requestNonce) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. Validate CSRF token
      if (!validateCSRFToken(body.csrfToken)) {
        console.log("❌ Invalid CSRF token");
        return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. Validate and consume nonce (prevent replay attacks)
      if (!validateAndConsumeNonce(body.requestNonce)) {
        console.log("❌ Invalid or reused nonce");
        return new Response(JSON.stringify({ error: "Invalid or reused request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Get session from cookie
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        console.log("❌ No session cookie found");
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionValue = sessionCookie.split("=")[1];
      const session = await verifySecureSession(sessionValue);
      
      if (!session) {
        console.log("❌ Invalid session");
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("✅ Session verified for user:", session.user.username);

      // 7. Rate limiting (per user)
      const rateLimitKey = `slash_${session.user.id}`;
      if (!checkRateLimit(rateLimitKey, 3, 3600000)) { // 3 slash requests per hour
        console.log("❌ Rate limit exceeded for user:", session.user.username);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before submitting another slash request." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 8. Validate content
      const contentValidation = validateReviewContent(body.title, body.description);
      if (!contentValidation.valid) {
        console.log("❌ Content validation failed:", contentValidation.error);
        return new Response(JSON.stringify({ error: contentValidation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 9. Send Discord notification for slash request
      const reviewerReputationLevel = body.reviewerReputationLevel || "reputable";
      
      try {
        await sendSlashNotification({
          title: body.title,
          description: body.description,
          reviewerReputationLevel: reviewerReputationLevel,
          targetUsername: body.profileUsername,
          requesterUsername: session.user.username, // Include requester for manual processing
        });
        console.log("✅ Slash Discord notification sent");
      } catch (discordError) {
        console.error("❌ Failed to send Discord notification:", discordError);
        // Don't fail the request if Discord fails - slash request is still recorded
      }

      console.log("✅ Slash request processed successfully");

      return new Response(JSON.stringify({
        success: true,
        message: "Slash request submitted successfully! We will review and process your request manually.",
        profileUsername: body.profileUsername,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("❌ Slash request error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 