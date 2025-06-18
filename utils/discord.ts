// Discord webhook notifications for anonymous reviews
// Sends notifications without revealing user identity

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: {
    text: string;
  };
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface ReviewNotificationData {
  sentiment: "negative" | "neutral" | "positive";
  title: string;
  description: string;
  reviewerReputationLevel: string;
  targetUsername: string;
  transactionHash: string;
  reviewId?: string;
}

interface SlashNotificationData {
  title: string;
  description: string;
  reviewerReputationLevel: string;
  targetUsername: string;
  requesterUsername: string;
}

// Discord color codes
const SENTIMENT_COLORS = {
  positive: 0x22c55e,  // Green
  neutral: 0xeab308,   // Yellow
  negative: 0xef4444,  // Red
};

// Get Discord webhook URL from environment
function getDiscordWebhookUrl(): string | null {
  return Deno.env.get("DISCORD_WEBHOOK_URL") || null;
}

// Check if Discord notifications are enabled
function isDiscordNotificationsEnabled(): boolean {
  return Deno.env.get("ENABLE_DISCORD_NOTIFICATIONS") !== "false" && !!getDiscordWebhookUrl();
}

// Create Discord embed for review notification
function createReviewEmbed(data: ReviewNotificationData): DiscordEmbed {
  const sentimentText = data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1);
  const basescanUrl = `https://basescan.org/tx/${data.transactionHash}`;
  
  const embed: DiscordEmbed = {
    title: `New ${sentimentText} Anonymous Review`,
    description: `A **${data.reviewerReputationLevel}** user left an anonymous review for **@${data.targetUsername}**`,
    color: SENTIMENT_COLORS[data.sentiment],
    fields: [
      {
        name: "Reviewer Level",
        value: data.reviewerReputationLevel,
        inline: true
      },
      {
        name: "Sentiment",
        value: sentimentText,
        inline: true
      },
      {
        name: "Review Title",
        value: data.title.length > 256 ? data.title.substring(0, 253) + "..." : data.title,
        inline: false
      },
      {
        name: "Review Description",
        value: data.description.length > 1000 ? data.description.substring(0, 997) + "..." : data.description,
        inline: false
      },
      {
        name: "Blockchain Transaction",
        value: `[View on BaseScan](${basescanUrl})`,
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Ethos Anonymous Reviews"
    }
  };

  // Add review link if available
  if (data.reviewId) {
    embed.fields!.push({
      name: "Ethos Review",
      value: `[View on Ethos](https://app.ethos.network/activity/review/${data.reviewId})`,
      inline: true
    });
  }

  return embed;
}

// Send simple Discord notification with just the review URL
export async function sendSimpleDiscordNotification(reviewUrl: string): Promise<void> {
  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
  const enabled = Deno.env.get("ENABLE_DISCORD_NOTIFICATIONS") === "true";
  
  if (!enabled || !webhookUrl) {
    console.log("📢 Discord notifications disabled or webhook URL not configured");
    return;
  }

  const payload = {
    content: reviewUrl
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log("✅ Simple Discord notification sent successfully");
  } catch (error) {
    console.error("❌ Failed to send Discord notification:", error);
    throw error;
  }
}

// Send Discord webhook notification
export async function sendReviewNotification(data: ReviewNotificationData): Promise<boolean> {
  // Check if notifications are enabled
  if (!isDiscordNotificationsEnabled()) {
    console.log("📢 Discord notifications disabled, skipping notification");
    return false;
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    console.log("⚠️ Discord webhook URL not configured");
    return false;
  }

  try {
    const embed = createReviewEmbed(data);
    const profileUrl = `https://app.ethos.network/profile/x/${data.targetUsername}`;
    
    // Put the URL on its own line for better Discord unfurling
    // Discord unfurling works better when the URL is separated and not formatted as markdown
    const payload: DiscordWebhookPayload = {
      content: `📋 **New Anonymous Review for @${data.targetUsername}**\n\n${profileUrl}`,
      embeds: [embed]
    };

    console.log("📢 Sending Discord notification for new review:", {
      sentiment: data.sentiment,
      target: data.targetUsername,
      reviewerLevel: data.reviewerReputationLevel,
      hasReviewId: !!data.reviewId,
      profileUrl: profileUrl
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Discord notification sent successfully");
      return true;
    } else {
      const errorText = await response.text();
      console.error("❌ Discord webhook failed:", response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending Discord notification:", error);
    return false;
  }
}

// Test Discord webhook (useful for setup verification)
export async function testDiscordWebhook(): Promise<boolean> {
  if (!isDiscordNotificationsEnabled()) {
    console.log("❌ Discord notifications are disabled");
    return false;
  }

  const testData: ReviewNotificationData = {
    sentiment: "positive",
    title: "Test Review Notification",
    description: "This is a test notification to verify Discord webhook configuration. The profile link above should unfurl to show a nice card preview of the reviewed person's Ethos profile.",
    reviewerReputationLevel: "reputable",
    targetUsername: "kairosagent", // Using a real Ethos profile that should have proper metadata
    transactionHash: "0x1234567890abcdef1234567890abcdef12345678",
    reviewId: "123"
  };

  console.log("🧪 Sending test Discord notification...");
  return await sendReviewNotification(testData);
}

// Create Discord embed for slash notification
function createSlashEmbed(data: SlashNotificationData): DiscordEmbed {
  const embed: DiscordEmbed = {
    title: "🔥 New Slash Request",
    description: `A **${data.reviewerReputationLevel}** user (@${data.requesterUsername}) has requested a slash for **@${data.targetUsername}**`,
    color: 0xef4444, // Red color for slash requests
    fields: [
      {
        name: "Requester Level",
        value: data.reviewerReputationLevel,
        inline: true
      },
      {
        name: "Target User",
        value: `@${data.targetUsername}`,
        inline: true
      },
      {
        name: "Requester",
        value: `@${data.requesterUsername}`,
        inline: true
      },
      {
        name: "Slash Title",
        value: data.title.length > 256 ? data.title.substring(0, 253) + "..." : data.title,
        inline: false
      },
      {
        name: "Slash Description",
        value: data.description.length > 1000 ? data.description.substring(0, 997) + "..." : data.description,
        inline: false
      },
      {
        name: "Action Required",
        value: "This slash request needs manual review and processing.",
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Ethos Anonymous Reviews - Slash Request"
    }
  };

  return embed;
}

// Send Discord webhook notification for slash requests
export async function sendSlashNotification(data: SlashNotificationData): Promise<boolean> {
  // Check if notifications are enabled
  if (!isDiscordNotificationsEnabled()) {
    console.log("📢 Discord notifications disabled, skipping slash notification");
    return false;
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    console.log("⚠️ Discord webhook URL not configured");
    return false;
  }

  try {
    const embed = createSlashEmbed(data);
    const profileUrl = `https://app.ethos.network/profile/x/${data.targetUsername}`;
    
    // Put the URL on its own line for better Discord unfurling
    const payload: DiscordWebhookPayload = {
      content: `🔥 **New Slash Request for @${data.targetUsername}**\n\n${profileUrl}`,
      embeds: [embed]
    };

    console.log("📢 Sending Discord notification for slash request:", {
      target: data.targetUsername,
      requester: data.requesterUsername,
      reviewerLevel: data.reviewerReputationLevel,
      profileUrl: profileUrl
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Discord slash notification sent successfully");
      return true;
    } else {
      const errorText = await response.text();
      console.error("❌ Discord slash webhook failed:", response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending Discord slash notification:", error);
    return false;
  }
} 