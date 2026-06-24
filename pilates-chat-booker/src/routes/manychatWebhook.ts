import { Router, Request, Response } from 'express';
import { getBookingRouter } from '../services/bookingRouter';
import { logger } from '../utils/logger';

const router = Router();

/**
 * ManyChat Webhook Payload Structure
 */
interface ManychatWebhookPayload {
  subscriber_id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  last_input?: string;
  last_input_text?: string;
  last_input_type?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * ManyChat Response Format
 */
interface ManychatResponse {
  version: string;
  content: {
    type: 'text' | 'cards' | 'buttons';
    text?: string;
    buttons?: Array<{
      type: 'open_url' | 'send_to_messenger' | 'show_block';
      label: string;
      url?: string;
      text?: string;
      block?: string;
    }>;
    cards?: Array<{
      title: string;
      description?: string;
      image_url?: string;
      buttons?: Array<{
        type: string;
        label: string;
        text?: string;
        url?: string;
      }>;
    }>;
  };
}

/**
 * Parse user intent from text input
 * Identifies whether user wants availability check or booking
 */
function parseUserIntent(input: string): {
  type: 'availability' | 'booking' | 'help';
  classType?: string;
  date?: string;
} {
  const lowerInput = input.toLowerCase();

  // Check for booking keywords
  if (
    lowerInput.includes('book') ||
    lowerInput.includes('sign up') ||
    lowerInput.includes('enroll') ||
    lowerInput.includes('reserve')
  ) {
    return { type: 'booking' };
  }

  // Check for availability keywords
  if (
    lowerInput.includes('available') ||
    lowerInput.includes('schedule') ||
    lowerInput.includes('when') ||
    lowerInput.includes('class') ||
    lowerInput.includes('time')
  ) {
    return { type: 'availability' };
  }

  // Extract class type if mentioned
  let classType = 'Pilates'; // Default
  if (lowerInput.includes('mat')) classType = 'Mat Pilates';
  if (lowerInput.includes('reformer')) classType = 'Reformer';
  if (lowerInput.includes('fusion')) classType = 'Fusion';

  return { type: 'help' };
}

/**
 * Extract date from natural language text
 * Supports: "today", "tomorrow", "Friday", specific dates, "next week", etc.
 */
function extractDate(input: string): string {
  const today = new Date();

  // Tomorrow
  if (input.toLowerCase().includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Today
  if (input.toLowerCase().includes('today')) {
    return today.toISOString().split('T')[0];
  }

  // Day of week (e.g., "Friday")
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of days) {
    if (input.toLowerCase().includes(day)) {
      const currentDay = today.getDay();
      const targetDay = days.indexOf(day);
      let daysAhead = targetDay - currentDay;

      if (daysAhead <= 0) {
        daysAhead += 7;
      }

      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + daysAhead);
      return nextDate.toISOString().split('T')[0];
    }
  }

  // Default to today if no date extracted
  return today.toISOString().split('T')[0];
}

/**
 * Build ManyChat response with text
 */
function buildTextResponse(text: string): ManychatResponse {
  return {
    version: '2.0',
    content: {
      type: 'text',
      text,
    },
  };
}

/**
 * Build ManyChat response with quick reply buttons
 */
function buildButtonResponse(
  text: string,
  buttons: Array<{ label: string; text: string }>,
): ManychatResponse {
  return {
    version: '2.0',
    content: {
      type: 'buttons',
      text,
      buttons: buttons.map((btn) => ({
        type: 'send_to_messenger',
        label: btn.label,
        text: btn.text,
      })),
    },
  };
}

/**
 * Build ManyChat response with class availability cards
 */
function buildClassCardsResponse(
  text: string,
  classes: Array<{
    id: string;
    name: string;
    time?: string;
    spots: number;
  }>,
): ManychatResponse {
  return {
    version: '2.0',
    content: {
      type: 'cards',
      text,
      cards: classes.map((cls) => ({
        title: cls.name,
        description: `${cls.time || ''}\n${cls.spots} spots available`,
        buttons: [
          {
            type: 'send_to_messenger',
            label: `Book: ${cls.name}`,
            text: `Book: ${cls.id}`,
          },
        ],
      })),
    },
  };
}

/**
 * POST /api/manychat/webhook
 * Receive messages from ManyChat, process booking requests, return formatted response
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    logger.info('Received ManyChat webhook request');

    const payload = req.body as ManychatWebhookPayload;

    // Extract required fields (supports both last_input and last_input_text)
    const userInput = (payload.last_input_text || payload.last_input)?.trim();
    const userId = payload.subscriber_id || payload.user_id || 'unknown';
    const firstName = payload.first_name || 'Friend';
    const email = payload.email || `${userId}@manychat.local`;
    const phone = payload.phone || '';

    if (!userInput) {
      logger.warn('ManyChat webhook received with no last_input or last_input_text');
      res.status(400).json({
        version: '2.0',
        content: {
          type: 'text',
          text: "I didn't catch that. What would you like help with? Try asking about available classes or booking a session!",
        },
      });
      return;
    }

    logger.info(`[${userId}] User input: ${userInput}`);

    // Parse user intent
    const intent = parseUserIntent(userInput);
    logger.info(`[${userId}] Detected intent: ${intent.type}`);

    let response: ManychatResponse;

    // Get booking router to process requests
    const bookingRouter = getBookingRouter();

    // Handle availability check
    if (intent.type === 'availability') {
      const date = extractDate(userInput);
      const classType = intent.classType || 'Pilates';

      logger.info(`[${userId}] Checking availability for ${classType} on ${date}`);

      const availability = await bookingRouter.checkAvailability(date, classType);

      if (!availability.success) {
        logger.warn(`[${userId}] Availability check failed: ${availability.error}`);
        response = buildTextResponse(
          `Sorry, I couldn't check availability right now. Please try again later or contact us directly!`,
        );
      } else {
        logger.info(`[${userId}] Found availability for ${classType}`);

        // Single class response from AvailabilityResponse interface
        const classCard = {
          id: availability.classId,
          name: availability.nextAvailableSlot ? `${classType} at ${availability.nextAvailableSlot}` : classType,
          time: availability.nextAvailableSlot || date,
          spots: availability.availableSpots,
        };

        response = buildClassCardsResponse(
          `Great! I found ${availability.availableSpots} available spot(s) for ${classType} on ${date}. Interested?`,
          [classCard],
        );
      }
    }
    // Handle booking request
    else if (intent.type === 'booking') {
      // Extract slot ID from user input (format: "Book: class-id" or "book class-id")
      const bookingMatch = userInput.match(/(?:book|Book).*?([a-zA-Z0-9\-]+)/i);
      const slotId = bookingMatch?.[1] || userInput.split(/[\s\-]+/).pop();

      if (!slotId || slotId.length < 3) {
        logger.info(`[${userId}] Booking request with unclear slot ID`);
        response = buildButtonResponse(
          "I'd love to help you book! 🎉 First, which class are you interested in?",
          [
            { label: 'Check Availability', text: 'What classes are available?' },
            { label: 'See Schedule', text: 'Show me the class schedule' },
          ],
        );
      } else {
        logger.info(`[${userId}] Processing booking for slot: ${slotId}`);

        const clientInfo = {
          email,
          firstName: firstName || 'Guest',
          lastName: payload.last_name || 'Student',
          phoneNumber: phone,
        };

        const booking = await bookingRouter.bookSlot(clientInfo, slotId);

        if (!booking.success) {
          logger.warn(`[${userId}] Booking failed: ${booking.error}`);
          response = buildTextResponse(
            `Oops! I couldn't complete the booking: ${booking.error}\n\nPlease try again or contact us at the studio.`,
          );
        } else {
          logger.info(`[${userId}] Booking successful: ${booking.bookingId}`);

          const confirmationText = `🎉 Booking Confirmed!\n\n` +
            `Confirmation: ${booking.confirmationNumber || booking.bookingId}\n` +
            `We've sent you a confirmation email.\n\n` +
            `See you on the mat! 🧘‍♀️`;

          response = buildTextResponse(confirmationText);
        }
      }
    }
    // Handle help/unknown intent
    else {
      logger.info(`[${userId}] Help request or unknown intent`);

      response = buildButtonResponse(
        `Hi ${firstName}! 👋 How can I help you with booking a Pilates class?`,
        [
          { label: '📅 Check Availability', text: 'What classes are available?' },
          { label: '📝 Book a Class', text: 'I want to book a class' },
          { label: '❓ Get Help', text: 'Tell me how this works' },
        ],
      );
    }

    const processingTime = Date.now() - startTime;
    logger.info(`[${userId}] ManyChat response sent in ${processingTime}ms`);

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(
      `ManyChat webhook error after ${processingTime}ms:`,
      error as Error,
    );

    res.status(500).json(
      buildTextResponse(
        `Sorry, something went wrong. Please try again or contact our support team.`,
      ),
    );
  }
});

/**
 * GET /api/manychat/webhook
 * Webhook validation endpoint (ManyChat may verify with GET request)
 */
router.get('/webhook', (req: Request, res: Response): void => {
  logger.info('ManyChat webhook validation request received');
  res.status(200).json({
    success: true,
    message: 'Webhook is active and ready to receive messages',
  });
});

export default router;
