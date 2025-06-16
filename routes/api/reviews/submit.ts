import { Handlers } from "$fresh/server.ts";
import { submitReview, sentimentToScore, isValidEthereumAddress, type ReviewData } from "../../../utils/blockchain.ts";

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
}

export const handler: Handlers = {
  async POST(req) {
    console.log("🔄 Processing review submission...");
    
    try {
      // Check authentication
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
      const session: TwitterSession = JSON.parse(atob(sessionData));

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log("❌ Session expired");
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse request body
      const body: SubmitReviewRequest = await req.json();
      console.log("📝 Review data received:", {
        profileUsername: body.profileUsername,
        sentiment: body.sentiment,
        titleLength: body.title.length,
        descriptionLength: body.description.length
      });

      // Validate required fields
      if (!body.profileUsername || !body.title || !body.description || !body.sentiment) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // For now, we'll need to resolve the Ethereum address from the profile
      // This could be done by:
      // 1. Looking up in Ethos API if they have an address
      // 2. Using a default address or ENS resolution
      // 3. Asking user to provide the address
      
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

      // Prepare review data for blockchain submission
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
        score: reviewData.score
      });

      // Submit to blockchain
      const txHash = await submitReview(reviewData);

      console.log("✅ Review submitted successfully:", txHash);

      return new Response(JSON.stringify({ 
        success: true, 
        transactionHash: txHash,
        message: "Review submitted successfully to blockchain"
      }), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("❌ Review submission error:", error);
      
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