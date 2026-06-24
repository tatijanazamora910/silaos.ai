# Deployment Checklist

Step-by-step guide for deploying Pilates Chat Booker to a new studio.

**Timeline:** 1-2 hours from contract to LIVE  
**Audience:** Implementation team / Sales-engineer  
**Last Updated:** June 24, 2026

---

## 📋 Pre-Deployment (Contract Phase)

### ✅ Step 1: Get Signed Contract

**Owner:** Sales / Account Management

- [ ] Studio signs service agreement
- [ ] Pricing model selected (per-booking / flat monthly / revenue share)
- [ ] Studio platform identified (Mindbody / Arketa / WellnessLiving / Momence)
- [ ] Primary contact confirmed (email + phone)
- [ ] Billing contact confirmed (may be different person)
- [ ] Go-live date agreed (usually within 7 days)

**Deliverable:** Signed contract in Stripe/Zuora

**Next:** Proceed to Step 2

---

## 🔑 Step 2: Collect API Credentials

**Owner:** Implementation / Technical Support  
**Duration:** 15-30 minutes (mostly waiting for studio to provide)

### For Mindbody:

- [ ] Request API Key from studio contact
  - **Where to find:** Mindbody Developer Portal → API Credentials → Authentication Keys
  - **How long to generate:** 2-5 minutes
  - **Format:** Usually starts with `sk_live_` or `sk_test_`
  - **Note:** SiteID -99 is sandbox; production SiteID is in their account settings

**Information to collect:**
```
Studio Name: _______________________
Mindbody API Key: _______________________
Mindbody SiteID: _______________________
Contact Email: _______________________
```

### For Arketa:

- [ ] Request API Key from studio contact
  - **Where to find:** Arketa Admin Portal → Integrations → API Keys
  - **How long to generate:** 2-5 minutes
  - **Format:** Usually starts with `ark_live_` or `ark_test_`

**Information to collect:**
```
Studio Name: _______________________
Arketa API Key: _______________________
Arketa Webhook URL: _______________________
Contact Email: _______________________
```

### For WellnessLiving:

- [ ] Request username and password from studio
  - **Use existing admin account** or **create service account** (recommended)
  - **Where to access:** WellnessLiving dashboard (kb.wellnessliving.com)
  - **Note:** If service account, ensure it has class read/write permissions

**Information to collect:**
```
Studio Name: _______________________
WL Username/Email: _______________________
WL Password: _______________________
Contact Email: _______________________
```

### For Momence:

- [ ] Request API Key from studio contact
  - **Where to find:** Momence Dashboard → Settings → API Keys
  - **How long to generate:** 2-5 minutes
  - **Format:** Usually starts with `sk_live_` or `sk_test_`
- [ ] Request Business ID from studio
  - **Where to find:** Momence Dashboard → Settings or API Documentation
  - **Format:** UUID or alphanumeric string

**Information to collect:**
```
Studio Name: _______________________
Momence API Key: _______________________
Momence Business ID: _______________________
Contact Email: _______________________
```

### Credential Handoff:

- [ ] Studio provides credentials via **secure method only**
  - ✅ In-person handoff
  - ✅ Password manager (1Password, Dashlane)
  - ✅ Encrypted email
  - ❌ DO NOT accept via Slack, unencrypted email, or SMS
  
- [ ] Verify credentials are correct
  - [ ] Can authenticate with Mindbody/Arketa/WellnessLiving/Momence
  - [ ] Can read class schedule
  - [ ] Can create test booking

**Deliverable:** Verified credentials in secure vault

**Next:** Proceed to Step 3

---

## ⚙️ Step 3: Update Environment Configuration

**Owner:** Technical Implementation  
**Duration:** 5 minutes  
**File:** `.env` (production server only)

### Option A: Direct Server Update (Simple)

Connect to production server:

```bash
ssh deployer@production.server.com

# Edit .env file
nano /app/.env

# Add credentials:
MODE=live
OPERATING_MODE=live
STUDIO_PLATFORM=mindbody

# Platform-specific credentials (choose ONE):

# For Mindbody:
MINDBODY_API_KEY=sk_live_actual_key_here
MINDBODY_SITEID=12345

# OR for Arketa:
ARKETA_API_KEY=ark_live_actual_key_here

# OR for WellnessLiving:
WL_USERNAME=studio@email.com
WL_PASSWORD=their_password_here

# OR for Momence:
MOMENCE_API_KEY=sk_live_actual_key_here
MOMENCE_BUSINESS_ID=uuid_or_id_here

# Save and exit (Ctrl+X, then Y)

# Verify the file
cat /app/.env | grep "STUDIO_PLATFORM\|API_KEY\|USERNAME"
# Should show: STUDIO_PLATFORM=mindbody (or chosen platform)
```

### Option B: Environment Variable Platform (Recommended for Production)

Use your hosting platform's secret management:

**Heroku:**
```bash
heroku config:set STUDIO_PLATFORM=mindbody \
  MINDBODY_API_KEY=sk_live_actual_key_here \
  MINDBODY_SITEID=12345 \
  --app production-app-name
```

**Docker/Kubernetes:**
```bash
kubectl create secret generic studio-secrets \
  --from-literal=STUDIO_PLATFORM=mindbody \
  --from-literal=MINDBODY_API_KEY=sk_live_actual_key_here \
  --from-literal=MINDBODY_SITEID=12345
```

**AWS Lambda / Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name studio/mindbody-credentials \
  --secret-string '{"api_key":"sk_live_...","site_id":"12345"}'
```

### Verification Checklist:

- [ ] `STUDIO_PLATFORM` is set to correct platform (mindbody/arketa/wellnessliving/momence)
- [ ] Platform API key/credentials are added
- [ ] `.env` file is NOT committed to git
- [ ] Credentials file permissions are restricted (chmod 600 if using .env file)
- [ ] Can restart server without errors

**Test Command:**
```bash
# Restart server and check logs
npm start
# Look for: "✅ [LIVE] Connected to [PLATFORM]"
# Or: "✅ PlatformController initialized: MODE=live"

# If errors appear, diagnose:
# - Check credential spelling
# - Verify API key is valid in platform dashboard
# - Check for typos in usernames/passwords
```

**Deliverable:** Working server with LIVE credentials

**Next:** Proceed to Step 4

---

## 🚀 Step 4: Toggle from DEMO to LIVE Mode

**Owner:** Implementation / QA  
**Duration:** 10 minutes  
**Approach:** Two-step verification process

### Phase 1: Verify LIVE Connection

```bash
# 1. Connect to server
ssh deployer@production.server.com

# 2. Check current mode
curl http://localhost:3000/api/platform/status

# Expected response:
# {
#   "platform": {
#     "mode": "live",
#     "isLive": true,
#     "isDemo": false,
#     "name": "mindbody",
#     "apiKeyConfigured": true
#   },
#   "studio": {
#     "platform": "mindbody",
#     "businessId": "configured"
#   }
# }
```

### Phase 2: Test Real Availability Check

```bash
# Test that we can actually talk to the platform
curl -X POST http://localhost:3000/api/adapters/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "date": "2026-06-25",
    "classType": "Pilates"
  }'

# Expected response should show REAL classes from the studio, not mock data
# Example:
# {
#   "success": true,
#   "platform": "mindbody",
#   "data": {
#     "classId": "class-123",
#     "maxCapacity": 20,
#     "currentEnrollment": 15,
#     "availableSpots": 5
#   }
# }
```

### Phase 3: Test Real Booking (Optional but Recommended)

```bash
# Create a test booking to verify end-to-end flow
curl -X POST http://localhost:3000/api/adapters/book \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "slotId": "class-123",
    "clientInfo": {
      "email": "test@studio.com",
      "firstName": "Test",
      "lastName": "Student",
      "phoneNumber": "555-0100"
    }
  }'

# Expected response:
# {
#   "success": true,
#   "platform": "mindbody",
#   "data": {
#     "bookingId": "BOOKING-12345",
#     "confirmationNumber": "CONF-ABC123",
#     "classId": "class-123"
#   }
# }

# ⚠️  IMPORTANT: Cancel this test booking in the studio system
#     to avoid double-counting in occupancy
```

### Phase 4: Verify in Studio System

- [ ] Login to studio's management system (Mindbody/Arketa/etc.)
- [ ] Confirm test booking appears in system
- [ ] Verify class enrollment is updated correctly
- [ ] Check that confirmation email was sent (check studio admin email)
- [ ] Cancel test booking (to clean up)

### Phase 5: Enable Chat Connections

**Connect Facebook Messenger:**
- [ ] Studio's Facebook Page is connected
- [ ] Webhook URL is configured: `https://production.server.com/api/manychat/webhook`
- [ ] Test message received from Facebook (watch logs)

**Connect WhatsApp (Optional):**
- [ ] WhatsApp Business Account verified
- [ ] Webhook configured
- [ ] Test message sent via WhatsApp

**Connect Instagram (Optional):**
- [ ] Instagram Business Account verified
- [ ] Webhook configured
- [ ] Test message sent via Instagram

### Verification Checklist:

- [ ] `/api/platform/status` returns `"mode": "live"`
- [ ] `/api/adapters/check-availability` returns REAL classes (not mock data)
- [ ] Test booking succeeds and appears in studio system
- [ ] Test booking is canceled/cleaned up
- [ ] Chat platforms are connected and receiving messages
- [ ] Logs show `[LIVE:MINDBODY]` or appropriate platform indicator
- [ ] No errors in application logs

**Deliverable:** Fully operational LIVE system

**Next:** Proceed to Step 5

---

## ✅ Step 5: Final Verification & Launch Approval

**Owner:** QA / Product Manager  
**Duration:** 15 minutes

### Production Readiness Checklist:

**System Health:**
- [ ] Server is responding to all endpoints
- [ ] Database is connected and queries are fast
- [ ] No error spikes in logs
- [ ] API response times are < 500ms
- [ ] Memory usage is stable (no leaks)

**Credential Security:**
- [ ] `.env` file is NOT in git repository
- [ ] No credentials appear in logs
- [ ] Pre-commit hooks prevent accidental commits
- [ ] Only deployment user has access to `.env`

**Integration Testing:**
- [ ] Availability check returns studio's real classes
- [ ] Booking creation syncs to studio system
- [ ] Confirmation emails are sent
- [ ] Chat platform webhooks are receiving messages
- [ ] Error handling works (try invalid class ID)
- [ ] Concurrent bookings are handled correctly

**Studio Readiness:**
- [ ] Studio staff trained on system (5 minutes)
- [ ] Studio knows how to monitor bookings
- [ ] Studio knows how to cancel/modify bookings
- [ ] Support contact information is confirmed
- [ ] Studio can reach support team (test email/phone)

**Documentation:**
- [ ] Studio has received welcome email
- [ ] Studio has access to documentation
- [ ] Studio knows to contact support for questions
- [ ] Support team has studio details in CRM

### Go/No-Go Decision:

**✅ GO LIVE if:**
- All checks above pass
- Studio staff confirms readiness
- No critical errors in logs
- System is handling bookings correctly

**❌ HOLD LIVE if:**
- Any credential issues remain
- Integration tests failing
- Studio staff report concerns
- Performance issues detected

---

## 📢 Step 6: Studio Launch & Announcement

**Owner:** Account Management / Marketing  
**Duration:** 15 minutes

### Launch Announcement:

**Send to Studio:**

```
Subject: 🎉 Pilates Chat Booker is LIVE!

Hi [Studio Name],

Your Autonomous Booking Agent is now live! 🚀

Students can now book classes instantly via:
✅ Facebook Messenger
✅ WhatsApp
✅ Instagram DMs

Here's what happens:
1. Student: "Do you have classes available?"
2. Agent: "Sure! Here are your options..."
3. Student: "Book me for 5pm"
4. Agent: "✅ Confirmed! See you at 5pm"
5. Your studio system: Booking is automatically created

👉 NEXT STEPS FOR YOUR TEAM:
- Share your studio's Facebook page link with students (they'll find you there)
- Send a message to your ManyChat number to test
- Monitor bookings in your normal system
- Contact support if you have questions

📞 Support: support@pilateschatbooker.com
📧 Questions? Reply to this email anytime

Ready to grow your occupancy!
```

### Student Announcement (Studio to Post):

```
🤖 NEW: Book classes with one click!

Tired of calling or waiting for responses?

Now you can book Mat Pilates and Reformer classes instantly via:
• Facebook Messenger
• WhatsApp  
• Instagram DMs

Just message us and get instant confirmation! ✨

Available 24/7 • No waiting • Instant confirmation

Message us now to book! 👉 [link to your page]
```

---

## 📊 Step 7: First 24 Hours Monitoring

**Owner:** Technical Support / Success Team  
**Duration:** Ongoing (watch during business hours)

### Monitor Dashboard:

```bash
# Check key metrics every 2 hours
curl http://localhost:3000/api/platform/status

# Watch logs for errors
tail -f /var/log/pilates-chat-booker.log | grep ERROR

# Check booking volume
# (In studio system) - compare to typical day
```

### Success Metrics (First 24 Hours):

- [ ] At least one booking received via chat (success!)
- [ ] No critical errors in logs
- [ ] Average response time < 500ms
- [ ] Studio staff reports no issues
- [ ] Messages are being delivered to studio

### Common Issues & Fixes:

| Issue | Solution |
|-------|----------|
| No messages arriving | Check webhook URL, verify API key in platform |
| Messages arrive but no response | Check server logs for errors, restart if needed |
| Bookings not appearing in studio system | Verify API credentials, check studio system permissions |
| Slow responses (> 2 seconds) | Check API rate limits, verify network connectivity |
| Students reporting "booking didn't work" | Verify booking is actually in studio system, may be on waitlist |

### First-Day Report:

Email studio with:
- Total bookings received: ___
- Total bookings confirmed: ___
- Issues encountered: (none / list)
- Success metrics: ✅ All green

---

## 🎓 Step 8: Staff Training & Handoff

**Owner:** Customer Success  
**Duration:** 15 minutes (can be async)

### Training Topics:

1. **How the System Works** (2 min)
   - Students message via Facebook/WhatsApp/Instagram
   - Agent responds automatically with availability
   - Bookings sync to their studio system
   - No staff action needed

2. **What Staff Needs to Do** (2 min)
   - Monitor bookings in normal system (no change)
   - Handle cancellations normally
   - Contact support if something looks wrong
   - That's it!

3. **What Staff Should NOT Do** (2 min)
   - Don't try to manually edit bookings made via agent (use studio system)
   - Don't change API credentials (contact support if needed)
   - Don't turn off webhooks
   - Don't share API keys

4. **Common Scenarios** (5 min)
   - Student books but doesn't show up → normal cancellation process
   - Student books twice (on waitlist + main list) → manual fix in studio system
   - System down → fallback to normal booking methods
   - Questions during booking → support team replies via chat

5. **Support & Escalation** (4 min)
   - Email: support@pilateschatbooker.com (2-hour response)
   - Phone: [phone number] (business hours)
   - Chat: Message us in Facebook (fastest)
   - Issues log: We monitor all errors 24/7

### Training Delivery:

- [ ] Send video walkthrough (5 min recording)
- [ ] Send written guide (1-page PDF)
- [ ] Schedule optional live training call
- [ ] Ask if questions (respond within 2 hours)

---

## 📈 Step 9: Success Metrics & Monitoring

**Owner:** Success Team  
**Duration:** Ongoing

### Metrics to Track (Daily):

```
Date: ________

Bookings:
- Total received: ___
- Confirmed: ___
- Conversion rate: ___% (confirmed / received)

Classes:
- Most booked class: ___________
- Least booked class: ___________
- Occupancy rate: ____%

Issues:
- Chat platform errors: ___
- Booking creation errors: ___
- API failures: ___

Revenue Impact:
- New bookings revenue: $___
- Platform cost: $___
- Net gain: $___
```

### Metrics to Track (Weekly):

- Booking trend (up/down/flat)
- No-show rate (compare to before)
- Repeat student bookings
- Class occupancy improvement
- Revenue increase

### Success Indicators:

- ✅ Bookings within first 24 hours
- ✅ Positive feedback from students
- ✅ No critical system errors
- ✅ Studio staff confirms it's working
- ✅ Week 1: +30% bookings vs. baseline

---

## 🎉 Step 10: Celebration & Expansion

**Owner:** Account Management  
**Duration:** Ongoing

### After 7 Days:

- [ ] Send success report to studio with metrics
- [ ] Share student testimonials (if any)
- [ ] Offer expansion (add more chat platforms)
- [ ] Discuss upgrade path (flat monthly pricing?)

### After 30 Days:

- [ ] Send ROI report
- [ ] Celebrate milestones with studio
- [ ] Gather feedback for improvements
- [ ] Discuss referral opportunities (they know other studios!)

---

## 📋 Deployment Checklist Summary

| Step | Owner | Duration | Status |
|------|-------|----------|--------|
| 1. Get signed contract | Sales | 1 hour | ☐ |
| 2. Collect API credentials | Implementation | 30 min | ☐ |
| 3. Update .env configuration | Technical | 5 min | ☐ |
| 4. Toggle DEMO → LIVE | Implementation | 10 min | ☐ |
| 5. Final verification | QA | 15 min | ☐ |
| 6. Launch announcement | Marketing | 15 min | ☐ |
| 7. First 24h monitoring | Support | Ongoing | ☐ |
| 8. Staff training | Success | 15 min | ☐ |
| 9. Metrics tracking | Success | Ongoing | ☐ |
| 10. Celebration! | Account Mgmt | Ongoing | ☐ |

**Total Time to LIVE: 1-2 hours**

---

## 🚨 Rollback Plan (If Issues)

If critical issues arise before launch:

```bash
# Step 1: Immediately revert to DEMO mode
ssh deployer@production.server.com
nano /app/.env
# Change: OPERATING_MODE=demo
# Save and exit

# Step 2: Restart server
systemctl restart pilates-chat-booker

# Step 3: Verify it's in DEMO
curl http://localhost:3000/api/platform/status
# Should show: "mode": "demo"

# Step 4: Notify studio
# "Temporary issue - we're in test mode for now"
# "Bookings working with demo data while we fix"
# Provide ETA for relaunching LIVE

# Step 5: Diagnose issue
# - Check credentials validity
# - Check API connectivity
# - Review logs for errors
# - Contact platform support if needed

# Step 6: Relaunch once resolved
# (Repeat Step 4 toggle process)
```

---

## ✨ Success - You're Deployed!

**Congratulations!** Your studio is now live on the Autonomous Booking Agent.

**What happens next:**
- Students book via chat 24/7
- Bookings sync to studio system automatically
- Classes fill up faster
- Revenue increases
- Your studio grows! 🚀

---

**Document Owner:** Implementation Team  
**Last Updated:** June 24, 2026  
**Version:** 1.0
