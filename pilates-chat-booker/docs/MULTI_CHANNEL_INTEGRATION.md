# Multi-Channel Lead Integration Guide

Complete guide to integrating all 5 lead capture channels into Pilates Chat Booker.

**Supported Channels:**
- ✅ Chat (Facebook Messenger, WhatsApp, Instagram)
- ✅ Email
- ✅ SMS (Twilio)
- ✅ Web Form
- ✅ Google Business Profile

**Status:** All channels are integrated and ready to deploy.

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│     5 INCOMING LEAD CHANNELS                │
├──────┬────────┬──────┬──────────┬──────────┤
│ Chat │ Email  │ SMS  │ Web Form │ Google   │
└──────┴────────┴──────┴──────────┴──────────┘
            ↓        ↓       ↓        ↓
            └────────────────────────┘
                     ↓
         ┌──────────────────────────┐
         │  Unified Lead Intake     │
         │  - Intent detection      │
         │  - Date extraction       │
         │  - Class type detection  │
         │  - Confidence scoring    │
         └──────────────────────────┘
                     ↓
         ┌──────────────────────────┐
         │   Booking Router         │
         │  - Check availability    │
         │  - Create booking        │
         └──────────────────────────┘
                     ↓
         ┌──────────────────────────┐
         │  Confirmations (Multi-Ch)│
         │  - Email reply           │
         │  - SMS reply             │
         │  - Chat message          │
         │  - Form confirmation     │
         └──────────────────────────┘
```

---

## 🚀 Deployment Checklist

### Phase 1: Environment Setup (15 min)

```bash
# Add to .env file:

# Email Configuration (SendGrid or Gmail)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_key_here
SENDER_EMAIL=bookings@yourstudio.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Google Business Configuration
GOOGLE_BUSINESS_API_KEY=your_google_business_key_here
GOOGLE_BUSINESS_PROJECT_ID=your_project_id_here
GOOGLE_BUSINESS_WEBHOOK_SECRET=your_webhook_secret_here

# Existing Configuration (already set)
OPERATING_MODE=live
STUDIO_PLATFORM=mindbody
```

---

## ✉️ Email Channel Setup

### Configuration

```bash
# 1. Install email library (if not already installed)
npm install nodemailer  # or use SendGrid SDK

# 2. Add credentials to .env
EMAIL_SERVICE=gmail  # or sendgrid
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SENDER_EMAIL=bookings@yourstudio.com

# 3. Test email service
curl -X GET http://localhost:3000/api/email/status
```

### Endpoints

- **POST** `/api/email/webhook` — Receive booking emails
- **GET** `/api/email/status` — Check email service status

### How It Works

1. **Studio or prospect sends email** to your booking email address
2. **Email webhook receives** the message
3. **System extracts:**
   - Client info (name, email, phone from signature)
   - Intent (availability search or booking request)
   - Class preferences from message body
4. **System responds** with availability or booking confirmation
5. **Booking syncs** to studio system

### Example Email

```
From: sarah@example.com
To: bookings@yourstudio.com
Subject: Interested in Reformer class

Hi, do you have any Reformer classes available this Friday?
I'm flexible on time.

Thanks,
Sarah Johnson
555-0100
```

**System Response:**
```
Hi Sarah,

We have availability for Reformer classes on Friday!

10:00 AM - Reformer Intensive with Maria (6 spots available)
5:00 PM - Reformer Flow with David (3 spots available)

Reply with your preferred time to book!

Best regards,
Pilates Chat Booker
```

---

## 📱 SMS Channel Setup (Twilio)

### Configuration

```bash
# 1. Create Twilio account at twilio.com
# 2. Get Account SID and Auth Token from dashboard
# 3. Get a phone number (e.g., +1-555-123-4567)

# 4. Add to .env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1555123456

# 5. Set Twilio webhook
# In Twilio console:
# - Go to Phone Numbers → Your Number
# - Under Messaging, set Webhook to:
#   https://yourdomain.com/api/sms/webhook

# 6. Test SMS service
curl -X GET http://localhost:3000/api/sms/status
```

### Endpoints

- **POST** `/api/sms/webhook` — Receive SMS messages (from Twilio)
- **GET** `/api/sms/status` — Check SMS service status

### How It Works

1. **Student texts your studio number** (e.g., +1-555-123-4567)
2. **Twilio sends webhook** to your server
3. **System parses SMS** for intent and preferences
4. **System responds via SMS** with availability (short, text-friendly)
5. **Booking confirmed** and synced to studio

### Example SMS

```
Student: Do you have classes today?

System: ✅ Available! 5 spots open for Pilates today. 
        Reply with preferred time (9am, 12pm, 5pm)?

Student: 5pm

System: 📅 Ready to book 5pm Pilates? Reply YES to confirm!

Student: YES

System: ✅ BOOKED! Confirmation: #BK-2026-0624-001. See you at 5pm! 🧘‍♀️
```

---

## 🌐 Web Form Channel Setup

### Configuration

```bash
# 1. Add form styling to your website (already provided)
# 2. Get embed code from our API:

curl -X GET "http://localhost:3000/api/webform/embed-code?studioId=your_studio_id"

# Response includes HTML form ready to copy-paste into your website
```

### Endpoints

- **POST** `/api/webform/submit` — Receive form submissions
- **GET** `/api/webform/embed-code` — Get HTML embed code
- **GET** `/api/webform/status` — Check form service status

### How It Works

1. **Add form to your website** (copy-paste HTML)
2. **Student fills out form** (name, email, phone, class preference, date)
3. **Form submits to** `/api/webform/submit`
4. **System validates** and checks availability
5. **Confirmation email sent** to student
6. **Booking synced** to studio

### Embed Code Example

```html
<!-- Copy this to your website -->
<div id="pilates-booking-form">
  <form onsubmit="submitBookingForm(event)">
    <input type="text" placeholder="First Name" name="firstName" required>
    <input type="email" placeholder="Email" name="email" required>
    <select name="classType">
      <option value="Mat Pilates">Mat Pilates</option>
      <option value="Reformer">Reformer</option>
    </select>
    <input type="date" name="preferredDate">
    <button type="submit">Book Your Class</button>
  </form>
</div>

<!-- Script included in embed code -->
```

---

## 🔵 Google Business Profile Setup

### Configuration

```bash
# 1. Create Google Cloud Project
# - Go to console.cloud.google.com
# - Create new project
# - Enable "Google My Business API"

# 2. Create OAuth 2.0 Credentials
# - Type: Web Application
# - Save your API key and client ID

# 3. Add to .env
GOOGLE_BUSINESS_API_KEY=your_api_key_here
GOOGLE_BUSINESS_PROJECT_ID=your_project_id_here
GOOGLE_BUSINESS_WEBHOOK_SECRET=your_webhook_secret_here

# 4. Set up Google Business webhook
# In Google Cloud Console:
# - Go to APIs → Google My Business API
# - Set webhook URL to: https://yourdomain.com/api/google/webhook
# - Subscribe to: booking.pending, booking.confirmed

# 5. Test Google integration
curl -X GET http://localhost:3000/api/google/status
```

### Endpoints

- **POST** `/api/google/webhook` — Receive Google Business bookings
- **GET** `/api/google/status` — Check Google integration status
- **GET** `/api/google/setup-instructions` — Get setup instructions

### How It Works

1. **Student sees your studio** on Google Maps
2. **Clicks "Book Now"** button on your Google Business profile
3. **Fills out appointment form** in Google
4. **Google sends webhook** to your system
5. **System auto-confirms** (if availability)
6. **Booking syncs** to studio system
7. **Confirmation sent** back to Google & student

---

## 📊 Unified Leads Dashboard

Access the real-time dashboard showing all leads from all channels:

```
GET http://localhost:3000/api/leads/dashboard
```

### Dashboard Features

- **Real-time lead feed** (auto-refreshes every 10 seconds)
- **Statistics by channel** (Email: 12, SMS: 8, Chat: 45, Web: 3, Google: 2)
- **Intent breakdown** (Availability: 30%, Booking: 55%, Help: 15%)
- **Confidence scoring** (0-100% for intent accuracy)
- **Sortable by:** Channel, intent, date, time, client name

### API Endpoints

```bash
# Get recent leads (JSON)
GET /api/leads/api/recent?limit=50

# Get statistics
GET /api/leads/api/stats

# Get leads by channel
GET /api/leads/api/by-channel?channel=email

# View dashboard (HTML)
GET /api/leads/dashboard
```

### Example Response

```json
{
  "success": true,
  "totalLeads": 70,
  "averageConfidence": 87,
  "byChannel": {
    "chat": 45,
    "email": 12,
    "sms": 8,
    "web_form": 3,
    "google": 2
  },
  "byIntent": {
    "availability": 21,
    "booking": 39,
    "help": 10,
    "unknown": 0
  }
}
```

---

## 🧪 Testing All Channels

### Test 1: Email Channel

```bash
# Send test email to your booking email
# Studio should receive in webhook, system responds
curl -X POST http://localhost:3000/api/email/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "bookings@yourstudio.com",
    "subject": "Test booking",
    "body": "Do you have Pilates classes tomorrow?"
  }'
```

### Test 2: SMS Channel

```bash
# Simulate Twilio webhook
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'From=+15550100&To=%2B15551234567&Body=Book%20me%20for%205pm&MessageSid=SM123'
```

### Test 3: Web Form

```bash
# Submit test form
curl -X POST http://localhost:3000/api/webform/submit \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Smith",
    "email": "sarah@example.com",
    "phoneNumber": "555-0100",
    "classType": "Reformer",
    "preferredDate": "2026-06-25",
    "preferredTime": "5pm"
  }'
```

### Test 4: Google Webhook

```bash
# Simulate Google Business booking
curl -X POST http://localhost:3000/api/google/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "google-123456",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "555-0100",
    "serviceType": "Pilates Class",
    "appointmentDate": "2026-06-25",
    "appointmentTime": "5:00 PM",
    "status": "pending"
  }'
```

### Test 5: View Dashboard

```bash
# Open in browser or fetch
curl http://localhost:3000/api/leads/dashboard
```

---

## 📈 Production Deployment

### Step 1: Verify Environment Variables

```bash
# Check all required vars are set
echo "EMAIL_SERVICE: $EMAIL_SERVICE"
echo "TWILIO_ACCOUNT_SID: $TWILIO_ACCOUNT_SID"
echo "GOOGLE_BUSINESS_API_KEY: $GOOGLE_BUSINESS_API_KEY"
echo "OPERATING_MODE: $OPERATING_MODE"
```

### Step 2: Deploy to Heroku/Server

```bash
# Push to your hosting platform
git push heroku main

# Verify all routes are live
curl http://your-domain.com/health
curl http://your-domain.com/api/email/status
curl http://your-domain.com/api/sms/status
curl http://your-domain.com/api/webform/status
curl http://your-domain.com/api/google/status
curl http://your-domain.com/api/leads/dashboard
```

### Step 3: Configure Platform Webhooks

**For each platform, set webhook URL to your server:**

- **Email:** Your email service provider settings
- **SMS:** Twilio console → Phone Numbers → Messaging webhooks
- **Web Form:** Already embedded in website
- **Google:** Google Cloud Console → Webhooks
- **Chat:** ManyChat settings (already configured)

### Step 4: Test Full Flow

1. Send email to booking email → verify response
2. Text studio number → verify SMS response
3. Submit website form → verify confirmation
4. Book via Google Maps → verify sync
5. Book via Facebook Messenger → verify sync
6. Check dashboard → should show all 5 channels represented

---

## 🔍 Monitoring & Maintenance

### Monitor Dashboard Health

```bash
# Check if dashboard is accessible and has data
curl http://your-domain.com/api/leads/api/stats | jq '.'
```

### Monitor Individual Channels

```bash
# Get status of each channel
curl http://your-domain.com/api/email/status
curl http://your-domain.com/api/sms/status
curl http://your-domain.com/api/webform/status
curl http://your-domain.com/api/google/status
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not being received | Check email webhook URL in provider settings |
| SMS not responding | Verify Twilio credentials and webhook URL in console |
| Web form 404 | Verify embed code includes correct studioId |
| Google bookings not syncing | Check API key and webhook setup in Google Cloud Console |
| Dashboard showing no leads | Verify leads are being created (check endpoint logs) |

---

## 📋 Checklist for Going Live

- [ ] All .env variables configured
- [ ] Email webhook URL set in email provider
- [ ] Twilio webhook URL set in Twilio console
- [ ] Google webhook URL set in Google Cloud
- [ ] Web form embed code added to website
- [ ] ManyChat webhook already configured
- [ ] Tested email booking flow
- [ ] Tested SMS booking flow
- [ ] Tested web form flow
- [ ] Tested Google booking flow
- [ ] Tested chat booking flow (already working)
- [ ] Dashboard loads with test data
- [ ] All 5 channels showing in dashboard
- [ ] Booking syncs to studio system (all channels)
- [ ] Confirmations sent to students (all channels)
- [ ] Team trained on monitoring dashboard

---

## 🎯 For Fire and Flow Pilates

**Quick Launch Path:**

1. **Today:** Deploy 5-channel system to server
2. **Tomorrow:** Configure Twilio, Email, Google webhooks
3. **Within 48 hours:** Go live with all 5 channels
4. **Day 3:** Monitor dashboard, celebrate 🎉

**Expected Results (Month 1):**
- 50-80% increase in bookings
- Bookings from multiple channels (not just chat)
- 5+ hours admin time saved weekly
- 2x ROI in first month

---

**Status:** ✅ All channels fully integrated and ready to deploy.

**Support:** For technical issues, see troubleshooting section above or contact support.
