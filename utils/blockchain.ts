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
      { "indexed": false, "internalType": "uint8", "name": "score", "type": "uint8" },
      { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
      { "indexed": true, "internalType": "bytes32", "name": "attestationHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "subject", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "reviewId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "profileId", "type": "uint256" }
    ],
    "name": "ReviewCreated",
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
  score: number; // 0-2 sentiment score (0=negative, 1=neutral, 2=positive)
  subjectAddress: string; // Ethereum address (can be zero address when using attestation)
  comment: string; // Short review title
  description: string; // Detailed review description
  reviewerUsername: string; // X username of reviewer (for attestation)
  subjectXAccountId: string; // X account ID of the person being reviewed (REQUIRED - no fallback to username)
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
  const reputationLevel = reviewData.reviewerReputationLevel || "reputable";
  console.log("🏷️ Creating anonymous disclaimer with reputation level:", {
    provided: reviewData.reviewerReputationLevel,
    fallback: "reputable",
    final: reputationLevel,
    lowercase: reputationLevel.toLowerCase()
  });
  const anonymousDisclaimer = `_This review was left anonymously by a **${reputationLevel.toLowerCase()}** Ethos user via anon.ethos.network_\n\n`;
  const fullDescription = anonymousDisclaimer + reviewData.description;
  
  // Prepare metadata JSON
  const metadata = JSON.stringify({
    description: fullDescription,
    source: "anon.ethos.network"
  });
  
  // Prepare attestation details - use subject's X account ID for attestation
  if (!reviewData.subjectXAccountId) {
    throw new Error("Subject X account ID is required - will not fall back to username for data integrity");
  }
  
  const attestationDetails: AttestationDetails = {
    account: reviewData.subjectXAccountId,
    service: "x.com"
  };
  
  // Convert score to uint8 (0-2 scale for sentiment: 0=negative, 1=neutral, 2=positive)
  const score = Math.max(0, Math.min(2, reviewData.score));
  
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
    
    console.log("📝 Transaction submitted, waiting for confirmation...", tx.hash);
    
    // Wait for confirmation with timeout (max 5 minutes)
    const receipt = await tx.wait(3); // Wait for 3 confirmations for reliability
    console.log("✅ Transaction confirmed with", receipt.confirmations, "confirmations:", receipt.hash);
    
    // Parse events to extract review ID with improved error handling
    let reviewId: number | undefined;
    
    try {
      console.log("🔍 Parsing transaction logs for ReviewCreated event...");
      console.log("Total logs in receipt:", receipt.logs.length);
      
      // Calculate expected event signature hash for debugging
      const eventSignature = "ReviewCreated(uint8,address,bytes32,address,uint256,uint256)";
      console.log("🎯 Expected event signature:", eventSignature);
      console.log("🔑 Contract interface events:", contract.interface.fragments.filter(f => f.type === 'event').map(e => e.format()));
      
      // Look for ReviewAdded event in the transaction receipt
      for (const log of receipt.logs) {
        try {
          // Only try to parse logs from our contract address
          if (log.address.toLowerCase() === config.contractAddress.toLowerCase()) {
            console.log("🔍 Attempting to parse log from contract:", {
              address: log.address,
              topics: log.topics,
              data: log.data
            });
            
            const parsedLog = contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            console.log("📝 Parsed log result:", {
              name: parsedLog?.name,
              hasArgs: !!parsedLog?.args,
              signature: parsedLog?.signature
            });
            
            if (parsedLog && parsedLog.name === 'ReviewCreated') {
              reviewId = parseInt(parsedLog.args.reviewId.toString());
              console.log("✅ Review ID successfully extracted from ReviewCreated event:", reviewId);
              console.log("📊 Event details:", {
                reviewId: reviewId,
                author: parsedLog.args.author,
                attestationHash: parsedLog.args.attestationHash,
                subject: parsedLog.args.subject,
                score: parsedLog.args.score.toString(),
                profileId: parsedLog.args.profileId.toString()
              });
              break; // Found the event, stop searching
            } else if (parsedLog) {
              console.log("📝 Found different event:", parsedLog.name);
            }
          }
        } catch (parseError) {
          console.log("❌ Error parsing log:", parseError.message);
          // Continue to next log if this one fails to parse
          continue;
        }
      }
      
      if (!reviewId) {
        console.log("⚠️ No ReviewCreated event found in transaction receipt");
        console.log("📋 Available logs:", receipt.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics
        })));
      }
    } catch (error) {
      console.error("❌ Failed to parse review ID from events:", error);
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