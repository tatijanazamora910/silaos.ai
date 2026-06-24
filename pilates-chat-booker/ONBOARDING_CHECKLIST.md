# Studio Onboarding Checklist

**Quick reference for sales and onboarding teams**

---

## 📋 Pre-Sale Verification

Use this to qualify leads and confirm compatibility before signing.

### Studio Questions

- [ ] **What studio management platform do you use?**
  - ✅ Mindbody
  - ✅ Arketa
  - ✅ WellnessLiving
  - ✅ Momence
  - ❌ Other (not supported yet)

- [ ] **Do you have an active account with [selected platform]?**
  - [ ] Yes
  - [ ] No (help them set up)

- [ ] **Who handles API integrations at your studio?**
  - [ ] Studio owner/manager
  - [ ] Tech staff
  - [ ] Platform support team

- [ ] **Has your studio completed integrations before?**
  - [ ] Yes (may have existing processes)
  - [ ] No (provide extra guidance)

---

## 📝 Contract/Agreements

- [ ] Integration agreement signed
- [ ] Data privacy/compliance requirements documented
- [ ] Support SLA defined
- [ ] Credential security responsibilities outlined
- [ ] Credential rotation frequency agreed

---

## 🔑 Credential Collection

**DO NOT** collect credentials via email. Use secure method:
- ✅ In-person handoff
- ✅ Secure credential management system (Dashlane, 1Password)
- ✅ Password manager with sharing capability
- ❌ Email, Slack, unencrypted documents

### Platform: Mindbody

**Credentials needed:** API Key

| Item | Notes |
|------|-------|
| MINDBODY_API_KEY | From Developer Portal |

**How to get it:**
1. Studio admin: Go to Mindbody Developer Portal
2. Create API key for "Chat Booking Integration"
3. Share key securely
4. Test immediately

**Questions:**
- [ ] Is this a production or sandbox key?
- [ ] Does the API key include: read classes, read clients, create bookings?

---

### Platform: Arketa

**Credentials needed:** API Key

| Item | Notes |
|------|-------|
| ARKETA_API_KEY | From Arketa Admin Portal |

**How to get it:**
1. Studio admin: Go to Arketa Admin Portal
2. Create API key for "Chat Booking Integration"
3. Share key securely
4. **Also:** Provide webhook URL to add to Arketa dashboard

**Questions:**
- [ ] Is this a production or testing key?
- [ ] Does studio want to set up webhooks for real-time updates?
- [ ] Who at studio can configure Arketa settings?

---

### Platform: WellnessLiving

**Credentials needed:** Admin Username + Password

| Item | Notes |
|------|-------|
| WL_USERNAME | Admin email or username |
| WL_PASSWORD | Admin password |

**How to get it:**
1. Ask: "Can we use your existing admin account, or should we create a service account?"
2. **Recommendation:** Create a service account with minimal permissions
3. Share credentials securely
4. Test immediately

**Questions:**
- [ ] Will you provide existing admin credentials or create a service account?
- [ ] Does your account have MFA enabled? (If yes, create app-specific password)
- [ ] Can you share a test environment password first?

---

### Platform: Momence

**Credentials needed:** API Key + Business ID

| Item | Notes |
|------|-------|
| MOMENCE_API_KEY | From Momence Dashboard Settings |
| MOMENCE_BUSINESS_ID | From Dashboard or API docs |

**How to get it:**
1. Studio admin: Go to Momence Dashboard
2. Create API key for "Chat Booking Integration"
3. Find Business ID in Settings
4. Share both securely
5. Test immediately

**Questions:**
- [ ] Can you provide both the API key and Business ID?
- [ ] Is this connected to your production studio data?

---

## ⚙️ Configuration Setup

### For Your Team (Implementation)

- [ ] .env file created from .env.example
- [ ] Credentials added to .env
- [ ] OPERATING_MODE set to "live"
- [ ] STUDIO_PLATFORM set correctly
- [ ] .env added to .gitignore
- [ ] .env file permissions restricted (chmod 600)

### For Studio (Optional)

- [ ] Email .env.example to studio (safe - no secrets)
- [ ] Explain what each field means
- [ ] Ask studio to provide credentials
- [ ] Securely transfer credentials

---

## ✅ Testing & Validation

Before going live, verify:

### 1. Configuration Correctness

```bash
# Check mode
curl http://localhost:3000/api/platform/status
# Look for: "isDemo": false, "platform": "[their-platform]"
```

### 2. API Connectivity

```bash
# Test can reach their platform
curl -X POST http://localhost:3000/api/adapters/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "[their-platform]",
    "date": "2026-06-25",
    "classType": "Pilates"
  }'
# Look for: "success": true with real class data
```

### 3. End-to-End Booking

```bash
# Test can create actual booking
curl -X POST http://localhost:3000/api/adapters/book \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "[their-platform]",
    "slotId": "[class-id-from-above]",
    "clientInfo": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "Student"
    }
  }'
# Look for: "success": true with booking confirmation
```

### 4. Data Verification

- [ ] Classes appear correctly
- [ ] Enrollment numbers are accurate
- [ ] Waitlist info is shown
- [ ] Booking creates confirmed entry in their system
- [ ] Confirmation email sent (if configured)

---

## 📞 Communication with Studio

### Before Setup

```
Subject: Pilates Chat Booker - Integration Setup

Hi [Studio Manager],

We're excited to get your studio connected! To set up the booking system, we need a few credentials from your studio management platform ([Platform Name]).

Here's what we need:
- [List credentials for their platform - see above]

Where to find: [Specific instructions for their platform]

Security note: We only need read and booking permissions. Please create a dedicated service account if possible.

Timeline: Setup usually takes 2-3 hours once we have credentials.

Questions? Reply to this email.

Best,
[Your Name]
```

### After Setup

```
Subject: Pilates Chat Booker - Ready to Launch! ✅

Hi [Studio Manager],

Great news! Your studio is now integrated with our booking system. Here's what you can do:

✅ Classes visible in chat: Students can see your Pilates schedule
✅ Real-time bookings: Book directly from chat
✅ Confirmations: Auto-sent to students

Next steps:
1. [What they need to do in their system]
2. [Any test scenarios to verify]
3. [How to report issues]

Questions? Contact: [Support Email]

Best,
[Your Name]
```

### Support Template

```
Subject: [Studio Name] - Integration Issue

To report an issue:

Please include:
1. What happened: _____________
2. When: _____________
3. Error message (if any): _____________
4. Screenshots: _____________

Troubleshooting steps we'll take:
- Check API connectivity
- Verify credentials are current
- Review platform logs
- Test booking flow

Expected resolution time: 2-4 hours
```

---

## 🔐 Security Verification

Before going live, verify with studio:

- [ ] Credentials are from a service/integration account (not personal)
- [ ] Account has minimal necessary permissions
- [ ] Studio is comfortable sharing credentials with us
- [ ] We have a plan for credential rotation
- [ ] Studio understands we store credentials in .env files
- [ ] Studio knows to notify us if credentials change
- [ ] Studio has backup contact if integration fails

---

## 📋 Credential Rotation Reminders

Set calendar reminders for credential rotation:

| Platform | Frequency | Responsible | Reminder Date |
|----------|-----------|-------------|---------------|
| Mindbody | Annually | Studio | _____________ |
| Arketa | Annually | Studio | _____________ |
| WellnessLiving | Every 6 months | Studio | _____________ |
| Momence | Annually | Studio | _____________ |

**Process:**
1. Studio: Generate new credentials in their dashboard
2. Studio → You: Share new credentials securely
3. You: Update .env file
4. Studio: Disable/delete old credentials
5. You: Test new credentials
6. Document: Update rotation tracker

---

## 📊 Onboarding Tracking

### Studio: _________________________

| Phase | Date | Status | Notes |
|-------|------|--------|-------|
| Lead Qualification | _____ | [ ] Complete | _____________ |
| Contract Signed | _____ | [ ] Complete | _____________ |
| Credentials Requested | _____ | [ ] Complete | _____________ |
| Credentials Received | _____ | [ ] Complete | _____________ |
| Configuration Setup | _____ | [ ] Complete | _____________ |
| Testing | _____ | [ ] Complete | _____________ |
| Go-Live | _____ | [ ] Complete | _____________ |
| First Booking | _____ | [ ] Complete | _____________ |
| 30-Day Check-in | _____ | [ ] Complete | _____________ |

---

## 🆘 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| "Missing environment variable" | [See Setup Guide → Troubleshooting](SETUP_GUIDE.md#-troubleshooting) |
| API authentication failed | Verify credentials in platform dashboard |
| Classes not showing | Check API permissions |
| Bookings not working | Verify can read AND create permissions |
| Webhook not being sent | Confirm webhook URL in platform settings |

---

## 📚 Documents to Share with Studio

- [ ] SETUP_GUIDE.md (technical details)
- [ ] .env.example (template)
- [ ] Integration SLA
- [ ] Privacy/Security Agreement
- [ ] Support Contact Info
- [ ] FAQ Document

---

## ✨ Success Indicators

After launch, monitor for:

✅ **Daily active bookings** (goal: 80% of expected)  
✅ **No error logs** in platform integration  
✅ **Studio staff confidence** (in support tickets)  
✅ **Real-time updates** working correctly  
✅ **Confirmation emails** being delivered  

If any metric is below target, follow up with studio to identify issues.

---

**Template Version:** 1.0  
**Last Updated:** June 24, 2026  
**Platforms:** Mindbody, Arketa, WellnessLiving, Momence
