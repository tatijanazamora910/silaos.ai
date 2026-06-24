# ManyChat Integration Guide

Complete guide to setting up and using the Pilates Chat Booker with ManyChat.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Webhook Configuration](#webhook-configuration)
4. [Message Flow](#message-flow)
5. [Supported Commands](#supported-commands)
6. [Response Formats](#response-formats)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Pilates Chat Booker integrates with ManyChat to handle Pilates class bookings directly through chat. Students can:

✅ **Check class availability** — "What classes are available tomorrow?"  
✅ **Book a class** — "Book me for Friday's Pilates class"  
✅ **Get confirmations** — Automatic confirmation with booking details  
✅ **Quick replies** — Easy buttons for common requests  

### Features

- **Natural language understanding** — Parse student requests naturally
- **Real-time availability** — Check actual studio class data
- **Instant bookings** — Create bookings directly in studio system
- **Confirmation emails** — Students receive booking confirmations
- **Error handling** — Graceful fallback if booking fails

---

## 🚀 Setup Instructions

### Step 1: Get ManyChat API Key

1. Go to **ManyChat Dashboard** → **Settings** → **API**
2. Create or copy your API key
3. Add to `.env`:
   ```env
   MANYCHAT_API_KEY=your_api_key_here
   MANYCHAT_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### Step 2: Deploy Your Server

Ensure your server is:
- ✅ Running and accessible from the internet
- ✅ Using HTTPS (required by ManyChat)
- ✅ Environment variables configured

```bash
# Start the server
npm start

# Server should be running on https://your-domain.com
```

### Step 3: Configure Webhook in ManyChat

1. Go to **ManyChat Dashboard** → **Integrations** → **Custom Integration**
2. **Webhook URL:** `https://your-domain.com/api/manychat/webhook`
3. **Method:** POST
4. **Content Type:** application/json

### Step 4: Set up ManyChat Flow

In ManyChat, create an automation or flow:

1. **Trigger:** When user sends a message
2. **Action:** Send to webhook
   - URL: `https://your-domain.com/api/manychat/webhook`
   - Pass user input as `last_input`
3. **Response:** Display webhook response in chat

### Step 5: Test the Integration

```bash
# Test webhook is accessible
curl https://your-domain.com/api/manychat/webhook

# Test with a message
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test-user-123",
    "first_name": "Jane",
    "last_input": "What classes are available?"
  }'
```

---

## 🔌 Webhook Configuration

### Endpoint Details

**URL:** `POST /api/manychat/webhook`

**Accepts:**
- GET requests (health check)
- POST requests (incoming messages)

### Request Format

ManyChat sends a JSON payload with user information and message:

```json
{
  "subscriber_id": "user-123",
  "user_id": "user-123",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0100",
  "last_input": "What classes are available tomorrow?",
  "last_input_type": "text",
  "action": "message"
}
```

### Response Format

The webhook returns ManyChat-formatted responses:

```json
{
  "version": "2.0",
  "content": {
    "type": "text",
    "text": "Here are the available classes..."
  }
}
```

---

## 💬 Message Flow

### Typical Conversation

```
User: "What classes are available today?"
↓
[Webhook parses "availability" intent]
↓
[Calls platformController.checkAvailability()]
↓
[Returns class cards with booking buttons]
↓
User sees: "Great! I found 3 spots available for Pilates today"
         [Button 1: Book Mat Pilates 9am]
         [Button 2: Book Reformer 5pm]
         [Button 3: Book Fusion 10am]
↓
User clicks: "Book Mat Pilates 9am"
↓
User's click sends: "Book: class-mat-001"
↓
[Webhook parses "booking" intent]
↓
[Calls platformController.bookSlot()]
↓
[Creates booking in studio system]
↓
User sees: "🎉 Booking Confirmed!"
         "Confirmation: #BK12345"
         "We've sent you a confirmation email"
```

---

## 🗣️ Supported Commands

### Availability Checks

User can ask about class availability in various ways:

```
"What classes are available?"
"Show me the Pilates schedule"
"Are there any classes tomorrow?"
"Do you have any mat classes today?"
"When is the next Reformer class?"
"Available classes for Friday?"
```

**Bot response:** Shows available classes with booking buttons

### Booking Requests

User can request to book a class:

```
"Book me for the 9am class"
"I want to sign up for Pilates"
"Can I enroll in the 5pm Reformer class?"
"Reserve a spot for me"
"Book: class-mat-001"  [After selecting from list]
```

**Bot response:** Confirmation with booking ID

### Help Requests

User can ask for help:

```
"Help"
"How does this work?"
"What can I do?"
"Tell me more"
```

**Bot response:** Quick reply buttons with options

---

## 📄 Response Formats

### 1. Text Response

Simple text message:

```json
{
  "version": "2.0",
  "content": {
    "type": "text",
    "text": "Hello! How can I help you book a class?"
  }
}
```

### 2. Button Response

Text with quick reply buttons:

```json
{
  "version": "2.0",
  "content": {
    "type": "buttons",
    "text": "What would you like to do?",
    "buttons": [
      {
        "type": "send_to_messenger",
        "label": "Check Availability",
        "text": "What classes are available?"
      },
      {
        "type": "send_to_messenger",
        "label": "Book a Class",
        "text": "I want to book a class"
      }
    ]
  }
}
```

### 3. Card Response

Display available classes as cards with booking buttons:

```json
{
  "version": "2.0",
  "content": {
    "type": "cards",
    "text": "Here are available classes:",
    "cards": [
      {
        "title": "Mat Pilates Class",
        "description": "9:00 AM\n5 spots available",
        "buttons": [
          {
            "type": "send_to_messenger",
            "label": "Book Now",
            "text": "Book: class-mat-001"
          }
        ]
      },
      {
        "title": "Reformer Class",
        "description": "5:00 PM\n3 spots available",
        "buttons": [
          {
            "type": "send_to_messenger",
            "label": "Book Now",
            "text": "Book: class-reformer-001"
          }
        ]
      }
    ]
  }
}
```

---

## ✅ Testing

### Test 1: Webhook Health Check

```bash
curl https://your-domain.com/api/manychat/webhook

# Expected response:
# {
#   "success": true,
#   "message": "Webhook is active and ready to receive messages"
# }
```

### Test 2: Availability Check

```bash
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test-user",
    "first_name": "Test",
    "last_input": "What classes are available today?"
  }'

# Expected response: Card response with available classes
```

### Test 3: Booking Request

```bash
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test-user",
    "first_name": "Test",
    "email": "test@example.com",
    "last_input": "Book: class-mat-001"
  }'

# Expected response: Confirmation message with booking ID
```

### Test 4: Intent Parsing

Test natural language understanding:

```bash
# Test availability intent
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{"subscriber_id": "test", "first_name": "Test", "last_input": "When is the next class?"}'

# Test booking intent
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{"subscriber_id": "test", "first_name": "Test", "last_input": "I want to sign up"}'

# Test help intent
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{"subscriber_id": "test", "first_name": "Test", "last_input": "Help"}'
```

### Test 5: Date Parsing

Test natural language dates:

```bash
curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test",
    "first_name": "Test",
    "last_input": "Classes available tomorrow?"
  }'

curl -X POST https://your-domain.com/api/manychat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test",
    "first_name": "Test",
    "last_input": "What about Friday?"
  }'
```

### Test 6: ManyChat Integration

In ManyChat:

1. Go to **Chats** → **Create Test Conversation**
2. Send messages like:
   - "What classes are available?"
   - "Book me for tomorrow"
   - "Help"
3. Verify responses display correctly

---

## 🐛 Troubleshooting

### Issue: Webhook Not Receiving Messages

**Cause:** ManyChat not configured to send to webhook

**Solution:**
1. Verify webhook URL in ManyChat: `https://your-domain.com/api/manychat/webhook`
2. Test with: `curl https://your-domain.com/api/manychat/webhook`
3. Check server logs: `tail -f logs/application.log | grep -i manychat`
4. Verify HTTPS is working: `curl -v https://your-domain.com/api/manychat/webhook`

### Issue: "Invalid signature" Error

**Cause:** Webhook signature verification failed

**Solution:**
1. Verify webhook secret matches ManyChat dashboard
2. Check `.env` has correct `MANYCHAT_WEBHOOK_SECRET`
3. Ensure ManyChat is sending `x-manychat-signature` header
4. Restart server after updating secret

### Issue: Classes Not Showing in Response

**Cause:** Availability check failed or DEMO mode not set up

**Solution:**
1. Check `OPERATING_MODE` in `.env` is set to "demo" or "live"
2. Verify platform credentials if in LIVE mode
3. Check logs: `grep -i "availability\|error" logs/application.log`
4. Test directly: 
   ```bash
   curl -X POST http://localhost:3000/api/platform/availability \
     -H "Content-Type: application/json" \
     -d '{"date": "2026-06-25", "classType": "Pilates"}'
   ```

### Issue: Booking Fails with Error

**Cause:** Issue creating booking in studio system

**Solution:**
1. Verify credentials are correct (if LIVE mode)
2. Check studio platform is accessible
3. Verify class ID exists and is bookable
4. Check logs for platform-specific error
5. Test booking directly via adapters endpoint

### Issue: User Info Not Captured

**Cause:** ManyChat not passing user data to webhook

**Solution:**
1. Ensure ManyChat is sending full payload
2. Fallback: Webhook still works with just `last_input`
3. Ask user for email if needed: "What's your email?"
4. Store in ManyChat user profile for future use

### Issue: Response Takes Too Long

**Cause:** Slow API response from studio platform

**Solution:**
1. Check internet connectivity
2. Verify studio platform is responsive
3. Add timeout handling (currently 30 seconds)
4. Consider caching class availability (optional)

---

## 🔐 Security Notes

### Webhook Signature Verification

ManyChat signs each request with a header:

```
X-ManyChat-Signature: signature_value
```

The webhook verifies:
1. Request comes from ManyChat (not spoofed)
2. Request hasn't been tampered with
3. Signature matches secret key

**To enable:** Ensure `MANYCHAT_WEBHOOK_SECRET` is set in `.env`

### Data Privacy

The webhook collects:
- User ID (subscriber_id)
- Name (first_name, last_name)
- Email address
- Phone number
- Message text

**Storage:**
- ✅ Email/phone stored in booking confirmation
- ✅ Messages logged temporarily for debugging
- ✅ No permanent message history in our system
- ✅ Check ManyChat's data retention policy

### PII Protection

User information is:
- ✅ Only transmitted over HTTPS
- ✅ Only used for booking confirmation
- ✅ Not shared with third parties
- ✅ Deleted per retention policy

---

## 📚 Integration Flowchart

```
ManyChat User
    ↓
[Types message]
    ↓
ManyChat Sends POST to webhook
    ↓
/api/manychat/webhook
    ↓
Parse intent (availability/booking/help)
    ↓
      ├─ Availability → Query platform adapter
      ├─ Booking → Create booking via adapter
      └─ Help → Show quick reply buttons
    ↓
Format response (text/cards/buttons)
    ↓
Send JSON to ManyChat
    ↓
ManyChat Displays Message in Chat
    ↓
User Sees Response
```

---

## 🚀 Production Checklist

Before going live with ManyChat integration:

### Configuration
- [ ] `.env` has `MANYCHAT_API_KEY`
- [ ] `.env` has `MANYCHAT_WEBHOOK_SECRET`
- [ ] HTTPS is enabled on server
- [ ] Webhook URL points to production domain

### Testing
- [ ] Webhook health check responds
- [ ] Availability check returns classes
- [ ] Booking flow completes successfully
- [ ] Error messages display gracefully
- [ ] Date parsing works correctly

### Security
- [ ] Webhook signature verification enabled
- [ ] HTTPS certificate is valid
- [ ] Rate limiting configured (optional)
- [ ] Logs don't contain sensitive data
- [ ] Backup procedures in place

### Monitoring
- [ ] Logs configured and monitored
- [ ] Error alerts set up
- [ ] Booking success rate tracked
- [ ] ManyChat integration health checked daily

---

## 📞 Support

For issues with:

**ManyChat Integration:** Check logs at `/logs/application.log`  
**Studio Platform Issues:** Check `/logs/platform.log`  
**Booking Failures:** Check specific adapter logs  

Contact: [Your Support Email]

---

**Last Updated:** June 24, 2026  
**Status:** Production Ready  
**Supported Platforms:** Mindbody, Arketa, WellnessLiving, Momence
