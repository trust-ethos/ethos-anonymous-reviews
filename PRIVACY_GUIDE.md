# Privacy & Anonymity Guide for Ethos Anonymous Reviews

This guide ensures that the application stores **no logs or information** about who logs in or writes reviews, maintaining complete anonymity.

## 🚨 Current Privacy Risks

The application currently logs user identification data in several places:

1. **User Authentication Logs** - Usernames and user IDs in auth flows
2. **Review Submission Logs** - Complete review data including reviewer identity
3. **Session Management Logs** - User session details and authentication events
4. **Rate Limiting Logs** - User-specific rate limiting events

## 🛡️ Complete Anonymity Configuration

### Step 1: Environment Variables for Maximum Privacy

Add these to your `.env` file:

```bash
# MAXIMUM PRIVACY CONFIGURATION

# Completely disable all console logging (recommended for production)
DISABLE_ALL_LOGS=true

# Alternative: Enable privacy-safe logging with data redaction
# DISABLE_ALL_LOGS=false
# ENABLE_LOGGING=true
# ANONYMIZE_USER_IDS=true
# REDACT_SENSITIVE_DATA=true
# LOG_RETENTION_DAYS=0

# Strong anonymization salt (CHANGE THIS)
ANONYMIZATION_SALT=your_unique_production_salt_here_make_it_very_long_and_random
```

### Step 2: Server/Hosting Configuration

#### For Deno Deploy:
```bash
# Set environment variables in Deno Deploy dashboard
DISABLE_ALL_LOGS=true
ANONYMIZATION_SALT=your_production_salt
```

#### For Self-Hosting:
```bash
# Disable system-level logging
export DISABLE_ALL_LOGS=true

# Disable web server access logs
# Nginx: access_log off;
# Apache: CustomLog /dev/null combined
```

### Step 3: Application-Level Privacy Features

The application implements these privacy features:

#### ✅ **No Persistent Storage**
- **Sessions**: Stored only in HTTP-only cookies (temporary)
- **Rate Limiting**: In-memory only, cleared on restart
- **CSRF Tokens**: In-memory only, auto-expire
- **Nonces**: In-memory only, prevent replay attacks

#### ✅ **Cryptographic Session Security**
- Sessions signed with HMAC-SHA256
- Cannot be tampered with or forged
- Automatic expiration
- No server-side session storage

#### ✅ **Anonymous Review Submission**
- Reviews submitted to blockchain with anonymous disclaimers
- No correlation between reviewer and review stored locally
- Only blockchain transactions contain review data
- Reviewer identity never stored on the review record

## 🔍 Data Flow Analysis

### Login Process:
1. User authenticates via Twitter OAuth
2. Session stored in browser cookie only
3. **No server-side session storage**
4. **No authentication logs** (with DISABLE_ALL_LOGS=true)

### Review Submission Process:
1. Session validated (no logging)
2. Review submitted to blockchain
3. **No local storage** of review content
4. **No correlation** between user and review
5. Session continues temporarily for additional reviews

### Data Lifetime:
- **Browser cookies**: Until logout or expiration
- **Memory state**: Until server restart
- **Logs**: None (with DISABLE_ALL_LOGS=true)
- **Blockchain**: Permanent but anonymous

## 🛡️ Production Security Checklist

### Environment Setup:
- [ ] Set `DISABLE_ALL_LOGS=true`
- [ ] Set strong `ANONYMIZATION_SALT`
- [ ] Set strong `SESSION_SECRET`
- [ ] Verify no database connections
- [ ] Disable web server access logs

### Server Configuration:
- [ ] Disable system logging for the application
- [ ] Configure log rotation to delete immediately
- [ ] Ensure no log aggregation services capture app logs
- [ ] Use ephemeral storage only

### Monitoring Without Compromise:
- [ ] Use error monitoring that strips personal data
- [ ] Monitor blockchain transactions only (public data)
- [ ] Use uptime monitoring without request logging
- [ ] Monitor resource usage without user tracking

## 🔧 Advanced Privacy Options

### Option 1: Complete Log Disable
```bash
# Maximum privacy - no logs at all
DISABLE_ALL_LOGS=true
```

### Option 2: Privacy-Safe Logging (for debugging)
```bash
# Logs with all sensitive data redacted
DISABLE_ALL_LOGS=false
ENABLE_LOGGING=true
ANONYMIZE_USER_IDS=true
REDACT_SENSITIVE_DATA=true
LOG_RETENTION_DAYS=0
```

### Option 3: Development Mode
```bash
# For development only - NOT for production
DISABLE_ALL_LOGS=false
ENABLE_LOGGING=true
ANONYMIZE_USER_IDS=false
REDACT_SENSITIVE_DATA=false
```

## 🔐 Privacy Verification

To verify privacy compliance:

1. **Check Environment Variables**:
   ```bash
   echo $DISABLE_ALL_LOGS  # Should be "true"
   ```

2. **Monitor Application Logs**:
   - No usernames should appear
   - No user IDs should appear
   - No review content should appear

3. **Verify No Persistent Storage**:
   - No database files
   - No log files with user data
   - Only blockchain transactions (anonymous)

4. **Test Session Isolation**:
   - Restart server → all user sessions cleared
   - No way to correlate past activities

## 🚫 What NOT to Do

**Never add these in production:**

```bash
# DON'T DO THIS - compromises anonymity
ENABLE_DETAILED_LOGGING=true
STORE_USER_SESSIONS=true
LOG_ALL_REQUESTS=true
DEBUG_MODE=true
```

**Never implement:**
- Database user tables
- Persistent session storage
- User activity tracking
- Request logging with user data
- Analytics with user identification

## 🎯 Anonymity Guarantee

With proper configuration, this application guarantees:

1. **No Long-term Storage**: All user data cleared on restart
2. **No User Correlation**: Cannot link reviews to reviewers
3. **No Activity Tracking**: Cannot track user behavior over time
4. **No Data Retention**: Zero-day log retention policy
5. **Cryptographic Sessions**: Sessions cannot be forged or tampered with
6. **Blockchain Anonymity**: Reviews include reputation level but not identity

The only permanent record is the anonymous review on the blockchain, which cannot be correlated back to the specific user account that submitted it. 