import { Handlers } from "$fresh/server.ts";
import { submitReview, sentimentToScore, type ReviewData, type ReviewSubmissionResult } from "../../../utils/blockchain.ts";
import { 
  verifySecureSession, 
  checkRateLimit, 
  validateCSRFToken, 
  validateOrigin, 
  validateAndConsumeNonce,
  validateReviewContent,
  type SecureSession 
} from "../../../utils/security.ts";
import { sendSimpleDiscordNotification } from "../../../utils/discord.ts";
import { getReviewerReputation } from "../../../utils/reputation.ts";

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
  reviewerReputationLevel?: string; // Ignored: the server looks up the reviewer's level itself
}

interface EthosUser {
  id: number;
  profileId: number;
  displayName: string;
  username: string;
  avatarUrl?: string;
  score: number;
  description?: string;
  status: string;
  userkeys: string[];
  xpTotal: number;
  xpStreakDays: number;
  stats: unknown;
}

type EthosUserResponse = EthosUser[];

// Function to resolve X account ID from Ethos API
async function resolveXAccountId(username: string): Promise<string | null> {
  try {
    console.log("🔍 Resolving X account ID for:", username);
    
    const requestPayload = {
      accountIdsOrUsernames: [username]
    };
    
    const ethosResponse = await fetch('https://api.ethos.network/api/v2/users/by/x', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!ethosResponse.ok) {
      console.log("❌ Ethos API request failed:", ethosResponse.status);
      return null;
    }

    const ethosData: EthosUserResponse = await ethosResponse.json();
    
    if (!ethosData || ethosData.length === 0) {
      console.log("❌ No Ethos profile found for:", username);
      return null;
    }

    const userProfile = ethosData[0];
    
    // Debug logging for userkeys
    console.log("🔍 Debug: Full user profile data for", username, ":", {
      id: userProfile.id,
      profileId: userProfile.profileId,
      username: userProfile.username,
      userkeys: userProfile.userkeys,
      userkeyCount: userProfile.userkeys?.length || 0
    });
    
    // First try: Look for X.com service key in userkeys
    const xServiceKey = userProfile.userkeys?.find(key => 
      key.startsWith('service:x.com:')
    );
    
    if (xServiceKey) {
      const accountId = xServiceKey.replace('service:x.com:', '');
      console.log("✅ Found X account ID for", username, ":", accountId);
      console.log("🎯 Will create attestation for: x.com/" + accountId + " (using actual X.com user ID from userkeys)");
      return accountId;
    }
    
    // Second try: Use Ethos Twitter user API to get actual X.com ID
    console.log("⚠️ No X service key found in userkeys, trying Ethos Twitter user API...");
    console.log("🔍 Available userkeys:", userProfile.userkeys);
    
    try {
      const twitterUserResponse = await fetch(`https://api.ethos.network/api/twitter/user?username=${username}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        }
      });
      
      if (twitterUserResponse.ok) {
        const twitterUserData = await twitterUserResponse.json();
        
        if (twitterUserData.ok && twitterUserData.data && twitterUserData.data.id) {
          const xAccountId = twitterUserData.data.id;
          console.log("✅ Found X account ID via Twitter user API for", username, ":", xAccountId);
          console.log("🎯 Will create attestation for: x.com/" + xAccountId + " (using actual X.com user ID from Twitter API)");
          return xAccountId;
        } else {
          console.log("❌ Twitter user API returned invalid data:", twitterUserData);
        }
      } else {
        console.log("❌ Twitter user API request failed:", twitterUserResponse.status);
      }
    } catch (twitterApiError) {
      console.error("❌ Error calling Twitter user API:", twitterApiError);
    }
    
    // Both methods failed - refuse to fall back to username
    console.log("❌ Both X service key lookup and Twitter user API failed for:", username);
    console.log("🚫 Refusing to fall back to username - failing request for data integrity");
    
    return null; // Return null to indicate failure
  } catch (error) {
    console.error("❌ Error resolving X account ID:", error);
    return null;
  }
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

      // 4. Server-side reputation gate (by X id, never username). Fails closed.
      const reputation = await getReviewerReputation(session.user.id);
      if (!reputation.ok) {
        console.log("❌ Reputation requirement not met:", reputation.reason);
        return new Response(JSON.stringify({ error: "Reputation requirement not met" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. Parse and validate request body
      let body: SubmitReviewRequest;
      try {
        body = await req.json();
      } catch (_error) {
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

      // 6. Validate required fields
      if (!body.profileUsername || !body.title || !body.description || !body.sentiment || !body.csrfToken || !body.requestNonce) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 7. Validate CSRF token
      if (!validateCSRFToken(body.csrfToken)) {
        console.log("❌ Invalid CSRF token");
        return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 8. Validate and consume nonce (prevent replay attacks)
      if (!validateAndConsumeNonce(body.requestNonce)) {
        console.log("❌ Invalid or reused nonce - possible replay attack");
        return new Response(JSON.stringify({ error: "Invalid request nonce" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 9. Validate content
      const contentValidation = validateReviewContent(body.title, body.description);
      if (!contentValidation.valid) {
        return new Response(JSON.stringify({ error: contentValidation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 10. Validate sentiment
      if (!["negative", "neutral", "positive"].includes(body.sentiment)) {
        return new Response(JSON.stringify({ error: "Invalid sentiment value" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 11. Resolve X account ID for attestation
      console.log("🔍 Resolving X account ID for attestation...");
      console.log("📋 Reviewer info:", {
        reviewerUsername: session.user.username,
        reviewerXId: session.user.id,
        targetUsername: body.profileUsername
      });
      
      const xAccountId = await resolveXAccountId(body.profileUsername);
      
      if (!xAccountId) {
        return new Response(JSON.stringify({ 
          error: `Unable to resolve X.com account ID for @${body.profileUsername}. We tried both the Ethos userkeys and the Twitter user API, but neither provided a valid X.com user ID.`,
          details: "Reviews require actual X.com user IDs for data integrity - we do not fall back to usernames.",
          troubleshooting: [
            "Verify the username is correct and the user exists on X.com",
            "Check if the user has their X.com account properly linked in their Ethos profile",
            "The user may need to update their Ethos profile connections"
          ]
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      console.log("✅ X account resolution successful:", {
        targetUsername: body.profileUsername,
        resolvedXAccountId: xAccountId,
        isActualXId: xAccountId !== body.profileUsername,
        attestationTarget: `x.com/${xAccountId}`
      });

      // 12. Disclaimer level comes only from the server-side reputation lookup
      const reviewerReputationLevel = reputation.level;

      // 13. Prepare review data for blockchain submission
      const sentimentScore = sentimentToScore(body.sentiment);
      console.log("🎯 Sentiment mapping:", {
        originalSentiment: body.sentiment,
        mappedScore: sentimentScore,
        mapping: "negative=0, neutral=1, positive=2"
      });
      
      const reviewData: ReviewData = {
        score: sentimentScore,
        subjectAddress: "0x0000000000000000000000000000000000000000", // Zero address - using attestation instead
        comment: body.title,
        description: body.description,
        reviewerUsername: session.user.username,
        subjectXAccountId: xAccountId, // Add X account ID for attestation
        reviewerReputationLevel: reviewerReputationLevel // Add reputation level for anonymous disclaimer
      };

      console.log("🔗 Submitting review to blockchain with data:", {
        reviewer: session.user.username,
        reviewerXId: session.user.id,
        reviewerReputationLevel: reviewerReputationLevel,
        subject: body.profileUsername,
        subjectXAccountId: xAccountId,
        score: reviewData.score,
        sentiment: body.sentiment,
        title: body.title,
        description: body.description,
        subjectAddress: reviewData.subjectAddress,
        paymentToken: "0x0000000000000000000000000000000000000000",
        attestationService: "x.com",
        attestationTarget: `x.com/${xAccountId}`,
        usingActualXId: xAccountId !== body.profileUsername,
        securityChecks: "✅ All passed"
      });

      // 14. Submit to blockchain and wait for confirmation
      console.log("🔗 Submitting review to blockchain, this may take 30-60 seconds...");
      const result: ReviewSubmissionResult = await submitReview(reviewData);

      console.log("✅ Review confirmed on blockchain:", {
        transactionHash: result.transactionHash,
        reviewId: result.reviewId,
        hasReviewId: !!result.reviewId
      });

      // Send Discord notification only if we have a review ID
      if (result.reviewId) {
        console.log("📢 Sending Discord notification with review ID:", result.reviewId);
        const reviewUrl = `https://app.ethos.network/activity/review/${result.reviewId}`;
        
        sendSimpleDiscordNotification(reviewUrl).catch(error => {
          console.error("⚠️ Discord notification failed (non-critical):", error);
        });
      } else {
        console.log("⚠️ Skipping Discord notification - no review ID available");
      }

      // Create response with review links
      const response: { success: boolean; transactionHash: string; reviewId?: string | number; message: string; links: Record<string, string> } = {
        success: true, 
        transactionHash: result.transactionHash,
        reviewId: result.reviewId,
        message: "Review submitted and confirmed on blockchain",
        links: {
          basescan: `https://basescan.org/tx/${result.transactionHash}`
        }
      };

      // Add Ethos review link if we have the review ID
      if (result.reviewId) {
        response.links.ethosReview = `https://app.ethos.network/activity/review/${result.reviewId}`;
        response.message = "Review submitted and confirmed! You can view it on Ethos.";
      } else {
        response.message = "Review submitted and confirmed on blockchain. Review ID will be available shortly on Ethos.";
      }

      return new Response(JSON.stringify(response), {
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