# Ethos Anonymous Reviews

A Fresh framework application for submitting anonymous reviews of Ethos profiles with Twitter authentication.

## Features

- 🔒 **Anonymous Reviews**: Submit honest feedback while maintaining privacy
- 🐦 **Twitter Authentication**: Secure OAuth 2.0 login with Twitter/X
- 🔍 **Profile Search**: Search and select Ethos profiles to review
- 🎯 **Review Types**: Negative, Neutral, or Positive feedback options
- 🛡️ **Secure**: Built with Deno and Fresh for security and performance

## Setup

### Prerequisites

- [Deno](https://deno.land/) v1.37 or higher
- Twitter Developer Account for OAuth credentials

### Twitter OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. In your app settings, add these redirect URIs:
   - Development: `http://localhost:8000/auth/twitter/callback`
   - Production: `https://your-domain.com/auth/twitter/callback`
4. Note your Client ID and Client Secret

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Twitter OAuth 2.0 Configuration
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:8000/auth/twitter/callback

# For production, update the redirect URI:
# TWITTER_REDIRECT_URI=https://your-domain.com/auth/twitter/callback
```

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/trust-ethos/ethos-anonymous-reviews.git
cd ethos-anonymous-reviews

# Start the development server
deno task start
```

The application will be available at `http://localhost:8000`.

## Authentication Flow

1. **Login**: Click "Connect with X" to start Twitter OAuth
2. **Authorization**: Authorize the app on Twitter
3. **Session**: User session is stored securely in HTTP-only cookies
4. **Review**: Submit anonymous reviews while authenticated
5. **Logout**: Clear session and return to anonymous state

## API Endpoints

- `GET /auth/twitter` - Initiate Twitter OAuth flow
- `GET /auth/twitter/callback` - Handle OAuth callback
- `GET /auth/logout` - Clear user session
- `GET /api/auth/me` - Check authentication status

## Deployment

The app is configured for deployment on [Deno Deploy](https://deno.com/deploy):

1. Connect your GitHub repository to Deno Deploy
2. Set environment variables in the Deno Deploy dashboard
3. Deploy automatically on push to main branch

## Architecture

- **Framework**: Fresh 1.7.3 (Deno's full-stack web framework)
- **Runtime**: Deno v2.x
- **Styling**: Tailwind CSS
- **State Management**: Preact Signals
- **Authentication**: Custom Twitter OAuth 2.0 implementation
- **API Integration**: Ethos Network API for profile search

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 