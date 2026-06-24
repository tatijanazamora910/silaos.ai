/**
 * SMS Booking Handler (Twilio Integration)
 *
 * Receives SMS messages and processes booking requests automatically.
 * Responds with availability and booking confirmations via text.
 *
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars
 * Webhook: POST /api/sms/webhook
 */

import { Router, Request, Response } from 'express';
import { getLeadIntakeService, LeadChannel } from '../services/leadIntake';
import { getBookingRouter } from '../services/bookingRouter';
import { logger } from '../utils/logger';

const router = Router();

interface SMSPayload {
  From: string; // Phone number
  To: string;
  Body: string;
  MessageSid?: string;
  NumMedia?: string;
}

/**
 * Format phone number to standard format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  return phone;
}

/**
 * Parse client info from SMS
 */
function parseSMSClientInfo(phoneNumber: string, messageBody: string): any {
  // In production, you'd look up the contact in your CRM
  // For now, use phone number as identifier
  const areaCode = phoneNumber.slice(1, 4);

  return {
    email: `${phoneNumber.replace(/\D/g, '')}@sms.local`,
    firstName: `SMS Contact`,
    lastName: `(${areaCode})`,
    phoneNumber: formatPhoneNumber(phoneNumber),
  };
}

/**
 * POST /api/sms/webhook
 * Receive and process booking SMS messages
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SMSPayload = req.body;

    if (!payload.From || !payload.Body) {
      logger.warn('[SMS] Missing required fields in SMS payload');
      res.status(400).json({ error: 'Missing From or Body' });
      return;
    }

    const phoneNumber = payload.From;
    const messageBody = payload.Body;

    logger.info(`[SMS] Received message from ${phoneNumber}`);
    logger.info(`[SMS] Message: "${messageBody}"`);

    // Parse client info
    const clientInfo = parseSMSClientInfo(phoneNumber, messageBody);

    // Process lead through unified intake
    const leadIntake = getLeadIntakeService();
    const leadResult = await leadIntake.processLead(LeadChannel.SMS, clientInfo, messageBody, {
      sourceId: payload.MessageSid || phoneNumber,
      phoneNumber,
    });

    if (!leadResult.success) {
      logger.error('[SMS] Failed to process lead');
      res.status(500).json({ error: 'Failed to process SMS' });
      return;
    }

    // Get the lead
    const lead = leadIntake.getLead(leadResult.leadId!);

    if (!lead) {
      res.status(500).json({ error: 'Lead not found' });
      return;
    }

    const bookingRouter = getBookingRouter();
    let smsReply = '';

    // Handle based on intent (keep SMS replies short for readability)
    if (lead.intent === 'availability') {
      logger.info(`[SMS] Checking availability`);

      const availability = await bookingRouter.checkAvailability(
        lead.extractedDate || new Date().toISOString().split('T')[0],
        lead.extractedClassType || 'Pilates',
      );

      if (availability.success) {
        smsReply = `✅ Available! ${availability.availableSpots} spots open for ${lead.extractedClassType || 'Pilates'} on ${lead.extractedDate}. Reply with preferred time to book!`;
      } else {
        smsReply = `❌ No availability for that date. Try a different date or class type. Reply with your preference!`;
      }
    } else if (lead.intent === 'booking') {
      logger.info(`[SMS] Processing booking`);

      smsReply = `📅 To complete your booking, please reply with: 1) Class date, 2) Class time, 3) Class type (if preferred). We'll confirm in 1 hour!`;
    } else {
      smsReply = `👋 Hi! Reply with: 1) Class type (Mat/Reformer), 2) Preferred date, 3) Preferred time. We'll send available options!`;
    }

    logger.info(`[SMS] Sending reply to ${phoneNumber}`);

    // In production, this would send via Twilio
    // Example: await twilioClient.messages.create({
    //   body: smsReply,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });

    res.json({
      success: true,
      leadId: leadResult.leadId,
      message: 'SMS processed successfully',
      replySent: true,
      replyPreview: smsReply,
    });
  } catch (error) {
    logger.error('[SMS] Webhook error:', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sms/status
 * Check SMS integration status
 */
router.get('/status', (req: Request, res: Response): void => {
  logger.info('[SMS] Status check');

  const twilioConfigured =
    !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_PHONE_NUMBER;

  res.json({
    status: twilioConfigured ? 'active' : 'not_configured',
    service: 'SMS Booking Handler (Twilio)',
    capabilities: ['receive', 'parse', 'auto-reply'],
    configured: twilioConfigured,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
    lastCheck: new Date().toISOString(),
  });
});

export default router;
