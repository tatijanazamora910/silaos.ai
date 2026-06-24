import { Router, Request, Response } from 'express';
import { AdapterFactory, ClientInfo } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Check Mindbody availability
 * Uses the Mindbody adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/check-availability', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { date, classType } = req.body as Record<string, unknown>;

    if (!date || typeof date !== 'string') {
      logger.warn('Mindbody availability check missing date parameter');
      res.status(400).json({
        success: false,
        error: 'Date is required',
      });
      return;
    }

    if (!classType || typeof classType !== 'string') {
      logger.warn('Mindbody availability check missing classType parameter');
      res.status(400).json({
        success: false,
        error: 'Class type is required',
      });
      return;
    }

    logger.info(`Checking Mindbody availability for ${classType} on ${date}`);

    const adapter = AdapterFactory.getAdapter('mindbody');
    const result = await adapter.checkAvailability(date, classType);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`Mindbody availability check failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`Mindbody availability check successful: ${result.availableSpots} spots`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Mindbody availability check error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Book a Mindbody class
 * Uses the Mindbody adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/book', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { slotId, clientInfo } = req.body as Record<string, unknown>;

    if (!slotId || typeof slotId !== 'string') {
      logger.warn('Mindbody booking missing slotId parameter');
      res.status(400).json({
        success: false,
        error: 'Slot ID is required',
      });
      return;
    }

    if (!clientInfo || typeof clientInfo !== 'object') {
      logger.warn('Mindbody booking missing clientInfo parameter');
      res.status(400).json({
        success: false,
        error: 'Client information is required',
      });
      return;
    }

    const clientData = clientInfo as Record<string, unknown>;
    if (!clientData.email || typeof clientData.email !== 'string') {
      logger.warn('Mindbody booking: client email required');
      res.status(400).json({
        success: false,
        error: 'Client email is required',
      });
      return;
    }

    logger.info(`Booking Mindbody slot ${slotId} for ${clientData.email}`);

    const adapter = AdapterFactory.getAdapter('mindbody');
    const result = await adapter.bookSlot(clientData as ClientInfo, slotId);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`Mindbody booking failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`Mindbody booking successful: ${result.bookingId}`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Mindbody booking error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete booking',
      processingTimeMs: processingTime,
    });
  }
});

export default router;
