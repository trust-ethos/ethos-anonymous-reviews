import { ethers } from "ethers";

// Environment configuration
export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  chainId: number;
}

// Review contract ABI - including events to parse review ID
const REVIEW_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint8", "name": "score", "type": "uint8" },
      { "internalType": "address", "name": "subject", "type": "address" },
      { "internalType": "address", "name": "paymentToken", "type": "address" },
      { "internalType": "string", "name": "comment", "type": "string" },
      { "internalType": "string", "name": "metadata", "type": "string" },
      {
        "components": [
          { "internalType": "string", "name": "account", "type": "string" },
          { "internalType": "string", "name": "service", "type": "string" }
        ],
        "internalType": "struct AttestationDetails",
        "name": "attestationDetails",
        "type": "tuple"
      }
    ],
    "name": "addReview",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "reviewId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "subject", "type": "address" },
      { "indexed": false, "internalType": "uint8", "name": "score", "type": "uint8" },
      { "indexed": false, "internalType": "string", "name": "comment", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "metadata", "type": "string" }
    ],
    "name": "ReviewAdded",
    "type": "event"
  }
];

export function getBlockchainConfig(): BlockchainConfig {
  const isTestnet = Deno.env.get("BLOCKCHAIN_NETWORK") === "testnet";
  
  if (isTestnet) {
    return {
      rpcUrl: Deno.env.get("TESTNET_RPC_URL") || "https://sepolia.base.org",
      privateKey: Deno.env.get("TESTNET_PRIVATE_KEY") || "",
      contractAddress: Deno.env.get("TESTNET_CONTRACT_ADDRESS") || "",
      chainId: 84532 // Base Sepolia
    };
  } else {
    return {
      rpcUrl: Deno.env.get("MAINNET_RPC_URL") || "https://mainnet.base.org",
      privateKey: Deno.env.get("MAINNET_PRIVATE_KEY") || "",
      contractAddress: Deno.env.get("MAINNET_CONTRACT_ADDRESS") || "0x6D3A8Fd5cF89f9a429BFaDFd970968F646AFF325",
      chainId: 8453 // Base Mainnet
    };
  }
}

export interface ReviewData {
  score: number; // 1-5 rating
  subjectAddress: string; // Ethereum address (can be zero address when using attestation)
  comment: string; // Short review title
  description: string; // Detailed review description
  reviewerUsername: string; // X username of reviewer (for attestation)
  subjectXAccountId?: string; // X account ID of the person being reviewed (for attestation)
  reviewerReputationLevel?: string; // Reputation level of the reviewer (for anonymous disclaimer)
}

export interface AttestationDetails {
  account: string;
  service: string;
}

export interface ReviewSubmissionResult {
  transactionHash: string;
  reviewId?: number;
}

export async function submitReview(reviewData: ReviewData): Promise<ReviewSubmissionResult> {
  const config = getBlockchainConfig();
  
  if (!config.privateKey) {
    throw new Error("Private key not configured");
  }
  
  if (!config.contractAddress) {
    throw new Error("Contract address not configured");
  }

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  // Create contract instance
  const contract = new ethers.Contract(config.contractAddress, REVIEW_CONTRACT_ABI, wallet);
  
  // Prepare description with anonymous disclaimer
  const reputationLevel = reviewData.reviewerReputationLevel || "Reputable";
  const anonymousDisclaimer = `_This review was left anonymously by a **${reputationLevel}** Ethos user via anon.ethos.network_\n\n`;
  const fullDescription = anonymousDisclaimer + reviewData.description;
  
  // Prepare metadata JSON
  const metadata = JSON.stringify({
    description: fullDescription,
    source: "anon.ethos.network"
  });
  
  // Prepare attestation details - use subject's X account ID for attestation
  const attestationDetails: AttestationDetails = {
    account: reviewData.subjectXAccountId || reviewData.reviewerUsername,
    service: "x.com"
  };
  
  // Convert score to uint8 (1-5 scale)
  const score = Math.max(1, Math.min(5, reviewData.score));
  
  try {
    console.log("🔗 Submitting review to blockchain with parameters:", {
      score,
      subject: reviewData.subjectAddress,
      paymentToken: "0x0000000000000000000000000000000000000000",
      comment: reviewData.comment,
      metadata,
      attestationDetails,
      network: config.chainId === 8453 ? "mainnet" : "testnet",
      contractAddress: config.contractAddress
    });
    
    // Submit transaction
    const tx = await contract.addReview(
      score,
      reviewData.subjectAddress,
      "0x0000000000000000000000000000000000000000", // No payment token (ETH)
      reviewData.comment,
      metadata,
      attestationDetails
    );
    
    console.log("Transaction submitted:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
    
    // Parse events to extract review ID
    let reviewId: number | undefined;
    
    try {
      // Look for ReviewAdded event in the transaction receipt
      const reviewAddedEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'ReviewAdded';
        } catch {
          return false;
        }
      });
      
             if (reviewAddedEvent) {
         const parsedEvent = contract.interface.parseLog(reviewAddedEvent);
         if (parsedEvent) {
           reviewId = parseInt(parsedEvent.args.reviewId.toString());
           console.log("✅ Review ID extracted from event:", reviewId);
         }
       } else {
        console.log("⚠️ No ReviewAdded event found in transaction receipt");
      }
    } catch (error) {
      console.log("⚠️ Failed to parse review ID from events:", error);
    }
    
    return {
      transactionHash: receipt.hash,
      reviewId
    };
  } catch (error) {
    console.error("Blockchain submission error:", error);
    throw new Error(`Failed to submit review to blockchain: ${error.message}`);
  }
}

export function isValidEthereumAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

// Convert sentiment to numeric score
export function sentimentToScore(sentiment: "negative" | "neutral" | "positive"): number {
  switch (sentiment) {
    case "negative":
      return 0; // 0 for negative reviews
    case "neutral":
      return 1; // 1 for neutral reviews
    case "positive":
      return 2; // 2 for positive reviews
    default:
      return 1;
  }
} 