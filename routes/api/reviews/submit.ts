import { Handlers } from "$fresh/server.ts";
import { submitReview, sentimentToScore, isValidEthereumAddress, type ReviewData } from "../../../utils/blockchain.ts";
import { 
  verifySecureSession, 
  checkRateLimit, 
  validateCSRFToken, 
  validateOrigin, 
  validateAndConsumeNonce,
  validateReviewContent,
  type SecureSession 
} from "../../../utils/security.ts";

interface TwitterSession {
  user: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  accessToken: string;
  expiresAt: number;
}

interface SubmitReviewRequest {
  profileId: number;
  profileUsername: string;
  profileAddress?: string; // Ethereum address if available
  title: string;
  description: string;
  sentiment: "negative" | "neutral" | "positive";
  csrfToken: string; // CSRF protection
  requestNonce: string; // Prevent replay attacks
}

export const handler: Handlers = {
  async POST(req) {
    console.log("🔄 Processing secure review submission...");
    
    try {
      // 1. Validate request origin
      if (!validateOrigin(req)) {
        console.log("❌ Invalid request origin");
        return new Response(JSON.stringify({ error: "Invalid request origin" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Check authentication with secure session
      const cookies = req.headers.get("cookie") || "";
      const sessionCookie = cookies.split(";").find(c => c.trim().startsWith("twitter_session="));
      
      if (!sessionCookie) {
        console.log("❌ No session cookie found");
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sessionData = sessionCookie.split("=")[1];
      const session: SecureSession | null = await verifySecureSession(sessionData);

      if (!session) {
        console.log("❌ Invalid or expired session");
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Rate limiting per user
      const rateLimitKey = `review_submit_${session.user.id}`;
      if (!checkRateLimit(rateLimitKey, 3, 300000)) { // 3 requests per 5 minutes
        console.log("❌ Rate limit exceeded for user:", session.user.username);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before submitting another review." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. Parse and validate request body
      let body: SubmitReviewRequest;
      try {
        body = await req.json();
      } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("📝 Review data received:", {
        profileUsername: body.profileUsername,
        sentiment: body.sentiment,
        titleLength: body.title?.length || 0,
        descriptionLength: body.description?.length || 0,
        hasCSRFToken: !!body.csrfToken,
        hasNonce: !!body.requestNonce
      });

      // 5. Validate required fields
      if (!body.profileUsername || !body.title || !body.description || !body.sentiment || !body.csrfToken || !body.requestNonce) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Validate CSRF token
      if (!validateCSRFToken(body.csrfToken)) {
        console.log("❌ Invalid CSRF token");
        return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 7. Validate and consume nonce (prevent replay attacks)
      if (!validateAndConsumeNonce(body.requestNonce)) {
        console.log("❌ Invalid or reused nonce - possible replay attack");
        return new Response(JSON.stringify({ error: "Invalid request nonce" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 8. Validate content
      const contentValidation = validateReviewContent(body.title, body.description);
      if (!contentValidation.valid) {
        return new Response(JSON.stringify({ error: contentValidation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 9. Validate sentiment
      if (!["negative", "neutral", "positive"].includes(body.sentiment)) {
        return new Response(JSON.stringify({ error: "Invalid sentiment value" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 10. Resolve Ethereum address
      let subjectAddress = body.profileAddress;
      
      if (!subjectAddress) {
        // Try to get address from Ethos API or use a placeholder
        // For now, we'll use a placeholder address - this should be improved
        console.log("⚠️ No Ethereum address provided, using placeholder");
        subjectAddress = "0x0000000000000000000000000000000000000001"; // Placeholder
      }

      if (!isValidEthereumAddress(subjectAddress)) {
        return new Response(JSON.stringify({ error: "Invalid Ethereum address" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 11. Prepare review data for blockchain submission
      const reviewData: ReviewData = {
        score: sentimentToScore(body.sentiment),
        subjectAddress: subjectAddress,
        comment: body.title,
        description: body.description,
        reviewerUsername: session.user.username
      };

      console.log("🔗 Submitting to blockchain...", {
        reviewer: session.user.username,
        subject: body.profileUsername,
        score: reviewData.score,
        securityChecks: "✅ All passed"
      });

      // 12. Submit to blockchain
      const txHash = await submitReview(reviewData);

      console.log("✅ Secure review submitted successfully:", txHash);

      return new Response(JSON.stringify({ 
        success: true, 
        transactionHash: txHash,
        message: "Review submitted successfully to blockchain"
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("❌ Secure review submission error:", error);
      
      let errorMessage = "Failed to submit review";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 