/**
 * Google Business Profile Booking Handler
 *
 * Syncs with Google Business Profile bookings.
 * Handles "Book Now" button clicks and direct appointment requests from Google Maps.
 *
 * Requires: Google Business Profile API credentials
 * Webhook: POST /api/google/webhook
 */

import { Router, Request, Response } from 'express';
import { getLeadIntakeService, LeadChannel } from '../services/leadIntake';
import { getBookingRouter } from '../services/bookingRouter';
import { logger } from '../utils/logger';

const router = Router();

interface GoogleBookingPayload {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

/**
 * POST /api/google/webhook
 * Receive Google Business Profile booking events
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: GoogleBookingPayload = req.body;

    if (!payload.bookingId || !payload.customerEmail) {
      logger.warn('[Google] Missing required fields in booking payload');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    logger.info(`[Google] Received booking from ${payload.customerEmail}`);
    logger.info(`[Google] Booking ID: ${payload.bookingId} | Status: ${payload.status}`);

    const clientInfo = {
      email: payload.customerEmail,
      firstName: payload.customerName?.split(' ')[0] || 'Google Customer',
      lastName: payload.customerName?.split(' ')[1] || 'Booking',
      phoneNumber: payload.customerPhone || '',
    };

    // Construct message from booking data
    const bookingMessage = `
Service: ${payload.serviceType || 'Class Booking'}
Requested Date: ${payload.appointmentDate || 'Not specified'}
Requested Time: ${payload.appointmentTime || 'Not specified'}
Status: ${payload.status}
${payload.notes ? `\nNotes: ${payload.notes}` : ''}
`.trim();

    // Process lead through unified intake
    const leadIntake = getLeadIntakeService();
    const leadResult = await leadIntake.processLead(
      LeadChannel.GOOGLE,
      clientInfo,
      bookingMessage,
      {
        sourceId: payload.bookingId,
        googleBookingId: payload.bookingId,
        googleCustomerId: payload.customerId,
      },
    );

    if (!leadResult.success) {
      logger.error('[Google] Failed to process booking');
      res.status(500).json({ error: 'Failed to process booking' });
      return;
    }

    const lead = leadIntake.getLead(leadResult.leadId!);

    if (!lead) {
      res.status(500).json({ error: 'Lead not found' });
      return;
    }

    const bookingRouter = getBookingRouter();
    let confirmationMessage = '';

    // Handle based on status
    if (payload.status === 'pending') {
      logger.info('[Google] Processing pending booking');

      // Check availability
      const date = payload.appointmentDate || new Date().toISOString().split('T')[0];
      const classType = payload.serviceType || 'Pilates';

      const availability = await bookingRouter.checkAvailability(date, classType);

      if (availability.success) {
        // Attempt to book
        const booking = await bookingRouter.bookSlot(clientInfo, availability.classId);

        confirmationMessage = booking.success
          ? `✅ Booking confirmed! Your class on ${date} is reserved.`
          : `⚠️ Booking could not be completed. We'll reach out to confirm.`;
      } else {
        confirmationMessage = `⚠️ No availability for that date. We'll suggest alternatives.`;
      }
    } else if (payload.status === 'confirmed') {
      confirmationMessage = `✅ Your booking has been confirmed! See you at your class.`;
    } else if (payload.status === 'cancelled') {
      confirmationMessage = `Booking cancelled. Feel free to reach out if you'd like to reschedule.`;
    }

    logger.info(`[Google] Processing complete for ${payload.bookingId}`);

    res.json({
      success: true,
      leadId: leadResult.leadId,
      googleBookingId: payload.bookingId,
      message: 'Google booking processed successfully',
      confirmationMessage,
      nextStep: 'send_confirmation',
    });
  } catch (error) {
    logger.error('[Google] Webhook error:', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/google/status
 * Check Google Business Profile integration status
 */
router.get('/status', (req: Request, res: Response): void => {
  logger.info('[Google] Status check');

  const googleConfigured = !!process.env.GOOGLE_BUSINESS_API_KEY;

  res.json({
    status: googleConfigured ? 'active' : 'not_configured',
    service: 'Google Business Profile Handler',
    capabilities: ['receive-bookings', 'sync-availability', 'auto-confirm'],
    configured: googleConfigured,
    features: [
      '"Book Now" button handling',
      'Direct appointment requests',
      'Google Maps integration',
      'Auto-confirmation',
    ],
    lastCheck: new Date().toISOString(),
  });
});

/**
 * GET /api/google/setup-instructions
 * Get instructions for setting up Google Business integration
 */
router.get('/setup-instructions', (req: Request, res: Response): void => {
  const instructions = `
# Google Business Profile Integration Setup

## Step 1: Enable Google Business API
1. Go to Google Cloud Console
2. Create a new project
3. Enable "Google My Business API"
4. Create OAuth 2.0 credentials

## Step 2: Configure Webhook
1. Get your Business Profile ID
2. Set webhook URL to: https://your-domain.com/api/google/webhook
3. Subscribe to "booking" events

## Step 3: Environment Variables
Add to your .env file:
GOOGLE_BUSINESS_API_KEY=your_api_key_here
GOOGLE_BUSINESS_PROJECT_ID=your_project_id_here
GOOGLE_BUSINESS_WEBHOOK_SECRET=your_webhook_secret_here

## Step 4: Test
Send a test booking request to verify webhook receives data.

## Supported Events
- Pending bookings (new customer requests)
- Confirmed bookings (customer confirmed)
- Cancelled bookings (customer cancelled)

## Result
Bookings from Google Maps "Book Now" will:
1. Be received instantly
2. Checked for availability
3. Auto-confirmed if space available
4. Synced to your studio system
`.trim();

  logger.info('[Google] Setup instructions requested');

  res.json({
    success: true,
    instructions,
    webhookUrl: '/api/google/webhook',
    supportedEvents: ['booking.pending', 'booking.confirmed', 'booking.cancelled'],
  });
});

export default router;
