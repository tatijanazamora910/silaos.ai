# Pilates Chat Booker - Studio Setup Guide

A comprehensive guide for onboarding new studios and managing environment configuration securely.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Platform Credentials Checklist](#platform-credentials-checklist)
3. [Environment Configuration](#environment-configuration)
4. [Security Best Practices](#security-best-practices)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### For Development (DEMO Mode)

```bash
# 1. Copy template
cp .env.example .env

# 2. Keep OPERATING_MODE as 'demo' (no credentials needed)
OPERATING_MODE=demo

# 3. Start server
npm run dev

# 4. Test with mock data
curl -X GET http://localhost:3000/api/platform/demo-studio
```

**Demo mode is ready to use immediately with realistic Pilates class data.**

### For Production (LIVE Mode)

```bash
# 1. Copy template
cp .env.example .env

# 2. Set operating mode to live
OPERATING_MODE=live

# 3. Set platform and credentials (see checklist below)
STUDIO_PLATFORM=mindbody
MINDBODY_API_KEY=your_actual_key_here

# 4. Verify connection
npm run test

# 5. Start server
npm start
```

---

## 📝 Platform Credentials Checklist

### ✅ Pre-Integration Verification

Before collecting credentials from a studio, verify:

- [ ] Studio has active account with their chosen platform
- [ ] Studio has admin or API access enabled
- [ ] Integration contact has admin privileges
- [ ] Studio has authorized this integration
- [ ] Budget/cost implications understood (if any)

---

### 🔷 Mindbody Configuration

**Platform:** Mindbody by Zenoti  
**Auth Type:** REST API with Bearer Token  
**Status:** Production-ready with public sandbox

#### Credentials Needed

| Item | Where to Find | Example |
|------|---------------|---------|
| **MINDBODY_API_KEY** | Developer Portal → API Credentials | `v6Gt83kL9mP...` |

#### Step-by-Step Setup

1. **Request access to Developer Portal**
   - Contact: Mindbody Support
   - Request API credentials for third-party integration

2. **Create API key in Developer Portal**
   - Go to: https://developer.mindbodyonline.com
   - Navigate to: Settings → API Credentials → Authentication Keys
   - Create new key (or use existing if already created)
   - Copy the full key value

3. **Test connectivity**
   ```bash
   # Set in .env
   STUDIO_PLATFORM=mindbody
   MINDBODY_API_KEY=<your_key>
   OPERATING_MODE=live
   
   # Test
   curl -X POST http://localhost:3000/api/adapters/check-availability \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "mindbody",
       "date": "2026-06-25",
       "classType": "Pilates"
     }'
   ```

#### Permissions Required

- ✅ Read class/schedule data
- ✅ Read client information
- ✅ Create bookings
- ✅ View booking confirmations

#### API Sandbox

- **Sandbox SiteID:** `-99` (Mindbody public sandbox - for testing)
- **Production SiteID:** Your studio's actual SiteID (obtain from Mindbody)

---

### 🔶 Arketa Configuration

**Platform:** Arketa (Event-driven Scheduling)  
**Auth Type:** REST API with Bearer Token + Webhooks  
**Status:** Production-ready

#### Credentials Needed

| Item | Where to Find | Example |
|------|---------------|---------|
| **ARKETA_API_KEY** | Admin Portal → Integrations → API Keys | `ark_live_1234...` |

#### Step-by-Step Setup

1. **Request API key from Arketa**
   - Contact: Arketa Support (https://arketa.com)
   - Request: API key for third-party booking integration
   - Request: Webhook documentation

2. **Generate API key in Admin Portal**
   - Go to: Arketa Admin → Integrations → API Keys
   - Create new key for "Chat Booking Integration"
   - Copy the key (visible only once)

3. **Configure webhook in Arketa**
   - Webhook URL: `https://your-domain.com/api/arketa/webhook`
   - Events: `class.created`, `class.updated`, `enrollment.created`
   - Secret: Save for signature verification

4. **Test connectivity**
   ```bash
   # Set in .env
   STUDIO_PLATFORM=arketa
   ARKETA_API_KEY=<your_key>
   OPERATING_MODE=live
   
   # Test
   curl -X POST http://localhost:3000/api/adapters/check-availability \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "arketa",
       "date": "2026-06-25",
       "classType": "Pilates"
     }'
   ```

#### Permissions Required

- ✅ Read class/event data
- ✅ Read enrollment data
- ✅ Create enrollments
- ✅ View class availability

#### Webhook Events

Arketa sends updates for:
- Class creation/updates
- Enrollment changes
- Cancellations

**Important:** Keep webhook endpoint accessible and monitor logs for delivery errors.

---

### 🔵 WellnessLiving Configuration

**Platform:** WellnessLiving / Zen Planner  
**Auth Type:** Session-based (Username + Password)  
**Status:** Production-ready with auto-refresh

#### Credentials Needed

| Item | Where to Find | Example |
|------|---------------|---------|
| **WL_USERNAME** | Your WellnessLiving admin account | `studio-admin@example.com` |
| **WL_PASSWORD** | Your WellnessLiving password | `SecureP@ssw0rd!` |

#### Step-by-Step Setup

1. **Prepare studio account**
   - Existing admin: Use current WellnessLiving admin credentials
   - Or: Request new service account from studio manager
   - **Recommendation:** Create dedicated service account with minimal permissions

2. **Test credentials locally**
   ```bash
   # Set in .env
   STUDIO_PLATFORM=wellnessliving
   WL_USERNAME=your-email@example.com
   WL_PASSWORD=your-password
   OPERATING_MODE=live
   
   # Test authentication
   curl -X POST http://localhost:3000/api/wellnessliving/authenticate \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Verify session management**
   - System auto-refreshes sessions every 30 minutes
   - Monitor logs for session errors
   - No manual credential refresh needed

#### Permissions Required

- ✅ Read client information
- ✅ Read class schedule
- ✅ Create bookings
- ✅ View availability

#### Security Notes

- **Session Duration:** 30 minutes (auto-refresh)
- **Account Type:** Use service/integration account if available
- **Password:** Store securely, rotate annually
- **MFA:** If studio has MFA enabled, create app-specific password

---

### 🟢 Momence Configuration

**Platform:** Momence  
**Auth Type:** REST API with Bearer Token + Business ID  
**Status:** Production-ready with multi-tenant support

#### Credentials Needed

| Item | Where to Find | Example |
|------|---------------|---------|
| **MOMENCE_API_KEY** | Dashboard → Settings → API Keys | `sk_live_abc123...` |
| **MOMENCE_BUSINESS_ID** | Dashboard → Settings or API Docs | `biz_f47e8b2c9...` |

#### Step-by-Step Setup

1. **Generate API key in Momence Dashboard**
   - Go to: Momence Dashboard → Settings → API Keys
   - Create new API key for "Chat Booking Integration"
   - Copy the key (stored securely)

2. **Find Business ID**
   - Go to: Dashboard → Settings
   - Look for: "Business ID" or "Organization ID"
   - Or: Check API documentation or contact support

3. **Configure headers**
   - Header `Authorization: Bearer {MOMENCE_API_KEY}`
   - Header `X-Business-ID: {MOMENCE_BUSINESS_ID}`

4. **Test connectivity**
   ```bash
   # Set in .env
   STUDIO_PLATFORM=momence
   MOMENCE_API_KEY=<your_key>
   MOMENCE_BUSINESS_ID=<your_business_id>
   OPERATING_MODE=live
   
   # Test
   curl -X POST http://localhost:3000/api/adapters/check-availability \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "momence",
       "date": "2026-06-25",
       "classType": "Pilates"
     }'
   ```

#### Permissions Required

- ✅ Read class data
- ✅ Read customer information
- ✅ Create bookings
- ✅ View booking confirmation links

#### Multi-Tenant Routing

- Momence requires `X-Business-ID` header on all requests
- System automatically includes this header
- Multiple studios can be managed with different Business IDs

---

## 🔒 Environment Configuration

### File Structure

```
pilates-chat-booker/
├── .env              ← Your secrets (NEVER commit!)
├── .env.example      ← Template (safe to commit)
├── .gitignore        ← Prevents accidental commits
└── src/config/
    └── environment.ts ← Configuration loader
```

### Creating .env from Template

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit with your credentials
nano .env
# or
vi .env
# or use your IDE

# 3. Verify it's in .gitignore
cat .gitignore | grep "^\.env$"
```

### Configuration Modes

#### DEMO Mode (Development)

```env
OPERATING_MODE=demo
STUDIO_PLATFORM=mindbody
# No credentials needed - uses mock Pilates class data
```

**Use for:**
- Local development
- Testing workflows
- Demos to prospects
- Learning the system

**What you get:**
- 8 realistic mock Pilates classes
- Full booking simulation
- No external API calls

#### LIVE Mode (Production)

```env
OPERATING_MODE=live
STUDIO_PLATFORM=mindbody
MINDBODY_API_KEY=your_actual_key
```

**Use for:**
- Production deployments
- Real studio integrations
- Live bookings

**Behavior:**
- All credentials required
- Fails at startup if credentials missing
- Real API calls to studio platform
- Actual bookings created in their system

---

## 🔐 Security Best Practices

### 1. Protect .env File

```bash
# Restrict to owner only
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw-------
```

### 2. Never Commit Secrets

```bash
# Verify .gitignore includes .env
cat .gitignore | grep -E "^\.env|\.env\."

# If missing, add it
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Check what would be committed
git status
# .env should NOT appear in output
```

### 3. Use Environment Variables in Production

**Development (.env file):**
```bash
MINDBODY_API_KEY=sk_test_abc123...
```

**Production (environment variables):**
```bash
# Docker: Pass via -e or --env-file
docker run -e MINDBODY_API_KEY=sk_live_abc123... app

# Kubernetes: Use Secrets
kubectl create secret generic booking-secrets \
  --from-literal=MINDBODY_API_KEY=sk_live_abc123...

# AWS Lambda: Use Secrets Manager
aws secretsmanager create-secret --name booking/mindbody-key

# Heroku: Use Config Vars
heroku config:set MINDBODY_API_KEY=sk_live_abc123...
```

### 4. Credential Rotation Schedule

**API Keys:**
- ✅ Initial: Set on integration
- ✅ Every 12 months: Rotate in platform dashboard, update .env
- ✅ Immediate: If compromised or staff leaves

**Passwords (WellnessLiving):**
- ✅ Initial: Set on setup
- ✅ Every 6 months: Change in WellnessLiving dashboard, update .env
- ✅ Immediate: If compromised, staff leaves, or account change

**Webhook Secrets:**
- ✅ Every 6 months: Regenerate in platform, update configuration
- ✅ Test webhook delivery after rotation

### 5. Service Accounts

Create dedicated accounts for integrations:

**Mindbody:**
- Create integration-specific API key
- Limit to booking-related permissions

**WellnessLiving:**
- Create service account with minimal permissions
- Avoid using personal admin account
- Document the service account credentials

**Arketa & Momence:**
- Create dedicated API key in their dashboard
- Label as "Chat Booking Integration"
- Document the creation date

### 6. Monitoring and Logging

```bash
# Check logs for failed authentication
tail -f logs/application.log | grep -i "auth\|fail\|error"

# Monitor credential usage
tail -f logs/platform.log | grep -i "adapter\|connection"
```

### 7. Backup Strategy

```bash
# Secure backup of .env (encrypted)
gpg -c .env
# Stores .env.gpg (password-protected)

# Restore from backup
gpg -d .env.gpg > .env

# Or use commercial secret management:
# - AWS Secrets Manager
# - HashiCorp Vault
# - 1Password Business
# - Bitwarden Password Manager
```

---

## ✅ Testing the Integration

### 1. Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2026-06-24T..."}
```

### 2. Platform Status

```bash
curl http://localhost:3000/api/platform/status
# Expected: Current mode (demo/live), platform, API status
```

### 3. Availability Check

```bash
curl -X POST http://localhost:3000/api/adapters/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "date": "2026-06-25",
    "classType": "Pilates"
  }'
# Expected: Classes with capacity and enrollment info
```

### 4. Booking Test (DEMO Mode)

```bash
curl -X POST http://localhost:3000/api/adapters/book \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "slotId": "class-mat-001",
    "clientInfo": {
      "email": "student@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phoneNumber": "555-0100"
    }
  }'
# Expected: Booking confirmation with ID
```

### 5. Get Mock Studio Data (DEMO Only)

```bash
curl http://localhost:3000/api/platform/demo-studio
# Expected: 8 mock Pilates classes
```

### 6. Mode Switching (Testing)

```bash
# Switch to LIVE
curl -X POST http://localhost:3000/api/platform/mode/switch \
  -H "Content-Type: application/json" \
  -d '{"mode": "live"}'

# Switch back to DEMO
curl -X POST http://localhost:3000/api/platform/mode/switch \
  -H "Content-Type: application/json" \
  -d '{"mode": "demo"}'
```

---

## 🐛 Troubleshooting

### Issue: "Missing required environment variable"

**Cause:** Running in LIVE mode without credentials

**Solution:**
1. Check OPERATING_MODE in .env
2. If LIVE: Add all required credentials
3. If DEMO: Leave credentials blank or with placeholders

```bash
# Check current mode
cat .env | grep OPERATING_MODE

# For LIVE, ensure these are set:
echo $STUDIO_PLATFORM
echo $MINDBODY_API_KEY  # or appropriate platform key
```

### Issue: "Failed to initialize Momence adapter"

**Cause:** Invalid API key or Business ID

**Solution:**
```bash
# Verify in .env
grep -E "^MOMENCE_" .env

# Test credentials via Momence Dashboard API
curl -X GET https://api.momence.com/v1/classes \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "X-Business-ID: YOUR_BUSINESS_ID"
```

### Issue: "WellnessLiving session authentication failed"

**Cause:** Invalid username or password

**Solution:**
```bash
# Verify in .env
grep -E "^WL_" .env

# Test login in WellnessLiving system
# 1. Go to: https://kb.wellnessliving.com
# 2. Try logging in with the credentials
# 3. Ensure account has API access enabled
```

### Issue: "Arketa webhook not being delivered"

**Cause:** Webhook URL not accessible or wrong endpoint

**Solution:**
1. Verify webhook URL in Arketa dashboard matches your domain
2. Ensure your server is publicly accessible
3. Check firewall/network configuration
4. Monitor logs: `tail -f logs/arketa.log`
5. Test endpoint manually: `curl https://your-domain/api/arketa/webhook`

### Issue: "403 Forbidden on Mindbody API calls"

**Cause:** API key doesn't have required permissions or is invalid

**Solution:**
1. Verify API key in Mindbody Developer Portal
2. Check: Developer Portal → API Credentials → Current Keys
3. Verify permissions include:
   - Read classes
   - Read bookings
   - Create bookings
4. If using public sandbox, verify SiteID is -99

### Issue: Connection timeout

**Cause:** Network/firewall issue or API unreachable

**Solution:**
```bash
# Test connectivity to API endpoint
curl -v https://api.mindbodyonline.com/public/v6/class/classes
# Should not timeout

# Check DNS resolution
nslookup api.mindbodyonline.com

# Check firewall rules
# Ensure port 443 (HTTPS) is open outbound
```

### Issue: "Cannot find module" or import errors

**Cause:** Dependencies not installed

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild if needed
npm run build
```

---

## 📞 Support and Escalation

### Before Contacting Support

- [ ] Verify credentials are correct in the platform dashboard
- [ ] Confirm OPERATING_MODE matches your use case
- [ ] Run: `npm run test` to check configuration
- [ ] Check logs for specific error messages
- [ ] Try testing with DEMO mode first

### Information to Provide to Support

```
Studio Information:
- Studio name: _______________
- Platform: Mindbody | Arketa | WellnessLiving | Momence
- Environment: Development | Production
- OPERATING_MODE: demo | live

Error Details:
- Error message: _______________
- Timestamp: _______________
- Logs (relevant portion): _______________

Configuration (without secrets):
- NODE_ENV: _______________
- Platform: _______________
- API Key configured: Yes | No
- Credentials tested: Yes | No | Not applicable
```

---

## 📚 Additional Resources

- [Mindbody Developer Docs](https://developer.mindbodyonline.com)
- [Arketa API Documentation](https://arketa.com/docs)
- [WellnessLiving API Reference](https://kb.wellnessliving.com)
- [Momence API Docs](https://www.momence.com/developers)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Node.js dotenv](https://github.com/motdotla/dotenv)

---

## ✨ Quick Reference Checklist

### For Studio Onboarding

- [ ] Identify studio's platform
- [ ] Request API credentials (or username/password)
- [ ] Set up service account if possible
- [ ] Create .env file from .env.example
- [ ] Add credentials to .env
- [ ] Test connectivity with /api/platform/status
- [ ] Run full booking flow test
- [ ] Document credentials securely
- [ ] Set up credential rotation schedule
- [ ] Train staff on security practices
- [ ] Monitor logs for errors
- [ ] Set up support channel for emergencies

### For Deployment

- [ ] Set OPERATING_MODE=live
- [ ] Verify all credentials via environment variables
- [ ] Test connectivity before going live
- [ ] Set LOG_LEVEL=info (or higher for debugging)
- [ ] Configure monitoring/alerting
- [ ] Set up secure secret management
- [ ] Document disaster recovery plan
- [ ] Create runbook for common issues
- [ ] Test failover/backup procedures

---

**Last Updated:** June 24, 2026  
**Status:** Production Ready  
**Platforms Supported:** Mindbody, Arketa, WellnessLiving, Momence
