import { Handlers } from "$fresh/server.ts";
import { submitReview, sentimentToScore, isValidEthereumAddress, type ReviewData, type ReviewSubmissionResult } from "../../../utils/blockchain.ts";
import { 
  verifySecureSession, 
  checkRateLimit, 
  validateCSRFToken, 
  validateOrigin, 
  validateAndConsumeNonce,
  validateReviewContent,
  type SecureSession 
} from "../../../utils/security.ts";
import { sendReviewNotification } from "../../../utils/discord.ts";

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
  reviewerReputationLevel?: string; // Reputation level from UI (prevents re-fetch failures)
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
  stats: any;
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
    
    // Look for X.com service key in userkeys
    const xServiceKey = userProfile.userkeys?.find(key => 
      key.startsWith('service:x.com:')
    );
    
    if (xServiceKey) {
      const accountId = xServiceKey.replace('service:x.com:', '');
      console.log("✅ Found X account ID for", username, ":", accountId);
      return accountId;
    }
    
    console.log("❌ No X account ID found in userkeys for:", username);
    return null;
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

      // 10. Resolve X account ID for attestation
      console.log("🔍 Resolving X account ID for attestation...");
      const xAccountId = await resolveXAccountId(body.profileUsername);
      
      if (!xAccountId) {
        return new Response(JSON.stringify({ 
          error: `No X account ID found for @${body.profileUsername}. The user needs to have their X account connected to their Ethos profile to receive reviews.` 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 11. Get reviewer's reputation level for anonymous disclaimer
      let reviewerReputationLevel = "reputable"; // Default fallback
      
      if (body.reviewerReputationLevel) {
        // Use reputation level provided by UI (preferred method)
        reviewerReputationLevel = body.reviewerReputationLevel.toLowerCase();
        console.log("✅ Using reputation level from UI:", reviewerReputationLevel);
      } else {
        // Fallback: try to fetch reputation data (original method)
        console.log("⚠️ No reputation level provided by UI, attempting to fetch...");
        
        const reputationResponse = await fetch(`${req.url.split('/api/')[0]}/api/auth/reputation`, {
          headers: {
            'cookie': req.headers.get('cookie') || ''
          }
        });
        
        if (reputationResponse.ok) {
          const reputationData = await reputationResponse.json();
          console.log("📊 Reputation data for disclaimer:", {
            authenticated: reputationData.authenticated,
            hasReputation: !!reputationData.reputation,
            reputationLevel: reputationData.reputation?.level,
            score: reputationData.reputation?.score
          });
          
          if (reputationData.reputation?.level) {
            // Use lowercase for display
            reviewerReputationLevel = reputationData.reputation.level.toLowerCase();
            console.log("✅ Using reputation level for disclaimer:", reviewerReputationLevel);
          } else {
            console.log("⚠️ No reputation level found, using default:", reviewerReputationLevel);
          }
        } else {
          console.log("❌ Failed to fetch reputation data for disclaimer");
        }
      }

      // 12. Prepare review data for blockchain submission
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
        securityChecks: "✅ All passed"
      });

      // 13. Submit to blockchain and wait for confirmation
      console.log("🔗 Submitting review to blockchain, this may take 30-60 seconds...");
      const result: ReviewSubmissionResult = await submitReview(reviewData);

      console.log("✅ Review confirmed on blockchain:", {
        transactionHash: result.transactionHash,
        reviewId: result.reviewId,
        hasReviewId: !!result.reviewId
      });

      // Send Discord notification (non-blocking)
      sendReviewNotification({
        sentiment: body.sentiment,
        title: body.title,
        description: body.description,
        reviewerReputationLevel: reviewerReputationLevel,
        targetUsername: body.profileUsername,
        transactionHash: result.transactionHash,
        reviewId: result.reviewId?.toString()
      }).catch(error => {
        console.error("⚠️ Discord notification failed (non-critical):", error);
      });

      // Create response with review links
      const response: any = {
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