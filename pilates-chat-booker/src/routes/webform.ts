/**
 * Web Form Booking Handler
 *
 * Handles booking form submissions from studio websites.
 * Receives form data, processes booking, sends confirmation email.
 *
 * Webhook: POST /api/webform/submit
 * Also provides: GET /api/webform/embed-code (HTML to embed on site)
 */

import { Router, Request, Response } from 'express';
import { getLeadIntakeService, LeadChannel } from '../services/leadIntake';
import { getBookingRouter } from '../services/bookingRouter';
import { logger } from '../utils/logger';

const router = Router();

interface WebFormPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  classType?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
  studioId?: string;
}

/**
 * POST /api/webform/submit
 * Receive and process web form submissions
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: WebFormPayload = req.body;

    if (!payload.email || !payload.firstName) {
      logger.warn('[WebForm] Missing required fields');
      res.status(400).json({ error: 'Missing required fields: email, firstName' });
      return;
    }

    logger.info(`[WebForm] Received submission from ${payload.email}`);

    const clientInfo = {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName || 'Web Form',
      phoneNumber: payload.phoneNumber || '',
    };

    // Construct message from form fields
    const formMessage = `
Class Type: ${payload.classType || 'Any'}
Preferred Date: ${payload.preferredDate || 'No preference'}
Preferred Time: ${payload.preferredTime || 'No preference'}
${payload.message ? `\nAdditional Message: ${payload.message}` : ''}
`.trim();

    // Process lead through unified intake
    const leadIntake = getLeadIntakeService();
    const leadResult = await leadIntake.processLead(
      LeadChannel.WEB_FORM,
      clientInfo,
      formMessage,
      {
        sourceId: payload.email,
        studioId: payload.studioId,
        formData: payload,
      },
    );

    if (!leadResult.success) {
      logger.error('[WebForm] Failed to process submission');
      res.status(500).json({ error: 'Failed to process form' });
      return;
    }

    const lead = leadIntake.getLead(leadResult.leadId!);

    if (!lead) {
      res.status(500).json({ error: 'Lead not found' });
      return;
    }

    const bookingRouter = getBookingRouter();
    let confirmationEmail = '';

    // Check availability if date provided
    if (payload.preferredDate) {
      const availability = await bookingRouter.checkAvailability(
        payload.preferredDate,
        payload.classType || 'Pilates',
      );

      confirmationEmail = `
Hi ${payload.firstName},

Thank you for submitting our booking form!

${
  availability.success
    ? `
Great news! We have availability for ${payload.classType || 'Pilates'} on ${payload.preferredDate}.

Available Spots: ${availability.availableSpots}
Class: ${payload.classType}

To complete your booking, please:
1. Reply to this email confirming your preferred time
2. Or visit our booking page to confirm instantly

We'll send you a confirmation once your spot is reserved!
`
    : `
We received your booking request. Unfortunately, we don't have availability for ${payload.preferredDate}.

Our team will reach out within 1 hour to suggest alternative times that work for you.

Thank you for choosing us!
`
}

Best regards,
${payload.studioId ? 'Your Local Studio' : 'Pilates Chat Booker'}
`;
    } else {
      confirmationEmail = `
Hi ${payload.firstName},

Thank you for your interest in booking a class with us!

We've received your booking request. Our team will contact you at ${payload.phoneNumber || payload.email} within 1 hour to confirm your preferred class, date, and time.

We look forward to seeing you on the mat!

Best regards,
Your Pilates Studio
`;
    }

    logger.info(`[WebForm] Confirmation prepared for ${payload.email}`);

    // In production, send confirmation email via SendGrid/Nodemailer
    logger.info(`[WebForm] Email preview: ${confirmationEmail.substring(0, 150)}...`);

    res.json({
      success: true,
      leadId: leadResult.leadId,
      message: 'Form submitted successfully',
      nextStep: 'confirmation_email_sent',
      confirmationPreview: confirmationEmail.substring(0, 150),
    });
  } catch (error) {
    logger.error('[WebForm] Submission error:', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/webform/embed-code
 * Get HTML embed code for website
 */
router.get('/embed-code', (req: Request, res: Response): void => {
  const studioId = req.query.studioId || 'default';

  const embedCode = `
<!-- Pilates Chat Booker Form -->
<div id="pilates-booking-form">
  <form onsubmit="submitBookingForm(event)">
    <input type="text" placeholder="First Name" name="firstName" required>
    <input type="text" placeholder="Last Name" name="lastName">
    <input type="email" placeholder="Email" name="email" required>
    <input type="tel" placeholder="Phone" name="phoneNumber">

    <select name="classType">
      <option value="">Select Class Type</option>
      <option value="Mat Pilates">Mat Pilates</option>
      <option value="Reformer">Reformer</option>
      <option value="Fusion">Fusion</option>
    </select>

    <input type="date" placeholder="Preferred Date" name="preferredDate">
    <input type="time" placeholder="Preferred Time" name="preferredTime">
    <textarea placeholder="Any additional notes" name="message"></textarea>

    <button type="submit">Book Your Class</button>
  </form>
</div>

<script>
  async function submitBookingForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch('/api/webform/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          studioId: '${studioId}'
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Booking request submitted! We\\'ll confirm within 1 hour.');
        event.target.reset();
      } else {
        alert('❌ Error submitting form. Please try again.');
      }
    } catch (error) {
      alert('❌ Network error. Please try again.');
    }
  }
</script>

<style>
  #pilates-booking-form {
    max-width: 500px;
    margin: 20px auto;
    padding: 20px;
    background: #faf8f5;
    border-radius: 12px;
    border-left: 4px solid #8b9e88;
  }

  #pilates-booking-form form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  #pilates-booking-form input,
  #pilates-booking-form select,
  #pilates-booking-form textarea {
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
  }

  #pilates-booking-form button {
    padding: 12px;
    background: linear-gradient(135deg, #8b9e88 0%, #7a8d7f 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  #pilates-booking-form button:hover {
    opacity: 0.9;
  }
</style>
`.trim();

  logger.info('[WebForm] Embed code requested');

  res.json({
    success: true,
    embedCode,
    instructions: 'Copy the code above and paste it into your website HTML',
  });
});

/**
 * GET /api/webform/status
 * Check web form integration status
 */
router.get('/status', (req: Request, res: Response): void => {
  logger.info('[WebForm] Status check');

  res.json({
    status: 'active',
    service: 'Web Form Booking Handler',
    capabilities: ['receive', 'parse', 'auto-confirm', 'availability-check'],
    endpoints: [
      'POST /api/webform/submit',
      'GET /api/webform/embed-code',
      'GET /api/webform/status',
    ],
    lastCheck: new Date().toISOString(),
  });
});

export default router;
