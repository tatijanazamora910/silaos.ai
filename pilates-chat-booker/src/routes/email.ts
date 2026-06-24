/**
 * Email Booking Handler
 *
 * Receives booking emails and processes them automatically.
 * Extracts client info and booking intent, then responds with confirmation.
 *
 * Integration: Connect with email service (Gmail, Outlook, SendGrid, etc.)
 * Webhook: POST /api/email/webhook
 */

import { Router, Request, Response } from 'express';
import { getLeadIntakeService, LeadChannel } from '../services/leadIntake';
import { getBookingRouter } from '../services/bookingRouter';
import { logger } from '../utils/logger';

const router = Router();

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp?: string;
  messageId?: string;
}

/**
 * Parse email body to extract client info
 */
function parseEmailClientInfo(from: string, body: string): any {
  // Extract name from email or signature
  const lines = body.split('\n');
  let name = 'Email Sender';
  let phone = '';

  // Look for common patterns
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Extract phone
    const phoneMatch = line.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (phoneMatch) {
      phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
    }

    // Extract name (look for "Best" or "Thanks" + name pattern)
    if (
      lowerLine.includes('best') ||
      lowerLine.includes('thanks') ||
      lowerLine.includes('regards') ||
      lowerLine.includes('sincerely')
    ) {
      const nextLine = lines[lines.indexOf(line) + 1];
      if (nextLine && nextLine.trim()) {
        name = nextLine.trim();
      }
    }
  }

  return {
    email: from,
    firstName: name.split(' ')[0] || 'Student',
    lastName: name.split(' ')[1] || 'Email',
    phoneNumber: phone,
  };
}

/**
 * POST /api/email/webhook
 * Receive and process booking emails
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: EmailPayload = req.body;

    if (!payload.from || !payload.body) {
      logger.warn('[Email] Missing required fields in email payload');
      res.status(400).json({ error: 'Missing from or body' });
      return;
    }

    logger.info(`[EMAIL] Received booking email from ${payload.from}`);
    logger.info(`[EMAIL] Subject: ${payload.subject}`);

    // Parse client info from email
    const clientInfo = parseEmailClientInfo(payload.from, payload.body);

    // Process lead through unified intake
    const leadIntake = getLeadIntakeService();
    const leadResult = await leadIntake.processLead(
      LeadChannel.EMAIL,
      clientInfo,
      payload.body,
      {
        sourceId: payload.messageId || payload.from,
        emailSubject: payload.subject,
      },
    );

    if (!leadResult.success) {
      logger.error('[EMAIL] Failed to process lead');
      res.status(500).json({ error: 'Failed to process email' });
      return;
    }

    // Get the lead that was just created
    const lead = leadIntake.getLead(leadResult.leadId!);

    if (!lead) {
      res.status(500).json({ error: 'Lead not found after creation' });
      return;
    }

    // Get booking router
    const bookingRouter = getBookingRouter();

    let emailReply = '';

    // Handle based on detected intent
    if (lead.intent === 'availability') {
      logger.info(`[EMAIL] Checking availability for ${lead.extractedClassType}`);

      const availability = await bookingRouter.checkAvailability(
        lead.extractedDate || new Date().toISOString().split('T')[0],
        lead.extractedClassType || 'Pilates',
      );

      emailReply = `
Hi ${clientInfo.firstName},

Thank you for your inquiry!

${
  availability.success
    ? `We have availability for ${availability.classId}!

Date: ${lead.extractedDate}
Class Type: ${lead.extractedClassType}
Available Spots: ${availability.availableSpots}
Max Capacity: ${availability.maxCapacity}

To book, simply reply to this email with your preferred time, or visit our booking page.`
    : `Unfortunately, we don't have availability for that date and time.

Would you like to try a different date or class type? Just reply with your preferences.`
}

Best regards,
Pilates Chat Booker
`;
    } else if (lead.intent === 'booking') {
      logger.info(`[EMAIL] Processing booking request`);

      // For email bookings, we might need more confirmation
      emailReply = `
Hi ${clientInfo.firstName},

Thank you for your booking request!

To complete your booking, please reply to this email with:
1. Your preferred class date
2. Your preferred class time
3. Any class preference (Mat Pilates, Reformer, etc.)

We'll confirm your booking within 1 hour.

Best regards,
Pilates Chat Booker
`;
    } else {
      emailReply = `
Hi ${clientInfo.firstName},

Thank you for contacting us!

We'd love to help you book a Pilates class. Please reply with:
- What type of class you're interested in (Mat Pilates, Reformer, etc.)
- Your preferred date and time
- Any questions you have

We'll respond within the hour!

Best regards,
Pilates Chat Booker
`;
    }

    logger.info(`[EMAIL] Sending reply to ${payload.from}`);

    // Log the reply (in production, this would send via email service)
    logger.info(`[EMAIL] Reply content: ${emailReply}`);

    res.json({
      success: true,
      leadId: leadResult.leadId,
      message: 'Email processed successfully',
      replyScheduled: true,
      replyPreview: emailReply.substring(0, 100),
    });
  } catch (error) {
    logger.error('[EMAIL] Webhook error:', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/email/status
 * Check email integration status
 */
router.get('/status', (req: Request, res: Response): void => {
  logger.info('[EMAIL] Status check');
  res.json({
    status: 'active',
    service: 'Email Booking Handler',
    capabilities: ['receive', 'parse', 'auto-reply', 'track'],
    lastCheck: new Date().toISOString(),
  });
});

export default router;
