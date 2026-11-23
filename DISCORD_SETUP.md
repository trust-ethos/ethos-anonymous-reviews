# Discord Webhook Setup Guide

This guide explains how to set up Discord webhook notifications for new anonymous reviews.

## 🎯 What You'll Get

When a new anonymous review or slash request is submitted, your Discord channel will receive a rich embed notification with:

**For Reviews:**
- **Review Type**: Positive/Negative/Neutral (with color coding)
- **Reviewer Level**: Reputable/Exemplary user indication
- **Target Profile**: Link to the reviewed user's Ethos profile
- **Review Content**: Title and description
- **Blockchain Links**: BaseScan transaction and Ethos review links

**For Slash Requests:**
- **Request Type**: Slash request (with red color coding)
- **Requester Level**: Reputable+ user indication (anonymous)
- **Target Profile**: Link to the user being slashed
- **Slash Content**: Title and description of the request
- **Manual Review**: Notification that manual processing is required

**Privacy**: No user identity revealed - maintains complete anonymity for both reviews and slash requests

## 🔧 Discord Setup

### Step 1: Create a Discord Webhook

1. **Open Discord** and navigate to your server
2. **Right-click on the channel** where you want notifications
3. **Select "Edit Channel"**
4. **Go to "Integrations" tab**
5. **Click "Create Webhook"**
6. **Give it a name** (e.g., "Ethos Reviews")
7. **Copy the Webhook URL** - you'll need this for configuration

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Discord Webhook Configuration
ENABLE_DISCORD_NOTIFICATIONS=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Replace the webhook URL with your actual Discord webhook URL.**

### Step 3: Test Configuration

The app has no test endpoint: anyone could call one and post to your channel.
Test the webhook itself from your own machine instead:

```bash
# Posts one plain message to the channel
curl -H "Content-Type: application/json" \
  -d '{"content": "Webhook test"}' \
  "$DISCORD_WEBHOOK_URL"
```

Discord answers `204 No Content` and the message appears in the channel. The
first real review then shows the full embed.

## 📋 Configuration Options

### Enable/Disable Notifications

```bash
# Enable Discord notifications (default)
ENABLE_DISCORD_NOTIFICATIONS=true

# Disable Discord notifications
ENABLE_DISCORD_NOTIFICATIONS=false
```

### Optional Configuration

```bash
# If you want to disable notifications temporarily without removing the webhook URL
ENABLE_DISCORD_NOTIFICATIONS=false
```

## 🎨 Notification Example

Here's what a Discord notification looks like:

```
📋 New Anonymous Review for: https://app.ethos.network/profile/x/username
[Discord will show a rich card preview of the REVIEWED PERSON'S Ethos profile here]

🟢 New Positive Anonymous Review
A reputable user left an anonymous review for @username

Reviewer Level: reputable  
Sentiment: Positive

Review Title: Great collaboration partner
Review Description: Had an excellent experience working with this person on a DeFi project...

🔗 View on BaseScan | 🔗 View on Ethos
```

**Important:** The profile link and preview shows the **person being reviewed** (the target), not the reviewer (who remains anonymous).

**Features:**
- 🎨 **Rich Profile Preview**: Discord automatically unfurls the reviewed person's Ethos profile link to show a card with their avatar, name, and description
- 🎯 **Prominent Profile Link**: The main content includes the target's profile URL for Discord's auto-preview feature
- 🔒 **Anonymity Preserved**: Only the reviewed person's profile is shown, reviewer remains completely anonymous

**Color coding:**
- 🟢 **Green**: Positive reviews
- 🟡 **Yellow**: Neutral reviews  
- 🔴 **Red**: Negative reviews

## 🔒 Privacy & Security

The Discord notifications are designed to maintain anonymity:

- ✅ **No user identity revealed** - only reputation level shown
- ✅ **No authentication data** - no usernames or IDs
- ✅ **Public information only** - review content and blockchain data
- ✅ **Non-blocking** - notification failures don't affect review submission

## 🛠 Troubleshooting

### Webhook Not Working?

1. **Check webhook URL**: Make sure it's correctly copied from Discord
2. **Verify permissions**: Ensure the webhook has permission to post in the channel
3. **Test the webhook**: Post to it directly (see Step 3 above)
4. **Check logs**: Look for Discord-related errors in your application logs

### Environment Variables Not Loading?

1. **Restart the application** after adding environment variables
2. **Check .env file** is in the root directory
3. **Verify syntax** - no spaces around the `=` sign

## 📈 Production Deployment

### For Deno Deploy:

1. **Go to your Deno Deploy dashboard**
2. **Click on your project**
3. **Go to Settings → Environment Variables**
4. **Add the variables:**
   - `ENABLE_DISCORD_NOTIFICATIONS` = `true`
   - `DISCORD_WEBHOOK_URL` = `your_webhook_url_here`

### For Self-Hosted:

Add to your production environment or deployment scripts:

```bash
export ENABLE_DISCORD_NOTIFICATIONS=true
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your_webhook_url"
```

## 🔄 Automatic Notifications

Once configured, notifications are sent automatically when:

1. ✅ **A review is successfully submitted** to the blockchain
2. ✅ **The transaction is confirmed**
3. ✅ **Discord webhook is properly configured**

The notification includes all relevant information while preserving user anonymity.

## 💡 Tips

- **Use a dedicated channel** for review notifications to keep them organized
- **Set up channel permissions** so only relevant team members can see notifications
- **Test regularly** to ensure the webhook continues working
- **Monitor logs** for any Discord API issues

Your Discord notifications are now ready! 🎉 