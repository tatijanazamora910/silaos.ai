import { Router, Request, Response } from 'express';
import { AdapterFactory, ClientInfo } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Check Momence availability
 * Uses the Momence adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/check-availability', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { date, classType } = req.body as Record<string, unknown>;

    if (!date || typeof date !== 'string') {
      logger.warn('Momence availability check missing date parameter');
      res.status(400).json({
        success: false,
        error: 'Date is required',
      });
      return;
    }

    if (!classType || typeof classType !== 'string') {
      logger.warn('Momence availability check missing classType parameter');
      res.status(400).json({
        success: false,
        error: 'Class type is required',
      });
      return;
    }

    logger.info(`Checking Momence availability for ${classType} on ${date}`);

    const adapter = AdapterFactory.getAdapter('momence');
    const result = await adapter.checkAvailability(date, classType);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`Momence availability check failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`Momence availability check successful: ${result.availableSpots} spots`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Momence availability check error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Book a Momence class
 * Uses the Momence adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/book', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { slotId, clientInfo } = req.body as Record<string, unknown>;

    if (!slotId || typeof slotId !== 'string') {
      logger.warn('Momence booking missing slotId parameter');
      res.status(400).json({
        success: false,
        error: 'Slot ID is required',
      });
      return;
    }

    if (!clientInfo || typeof clientInfo !== 'object') {
      logger.warn('Momence booking missing clientInfo parameter');
      res.status(400).json({
        success: false,
        error: 'Client information is required',
      });
      return;
    }

    const clientData = clientInfo as Record<string, unknown>;
    if (!clientData.email || typeof clientData.email !== 'string') {
      logger.warn('Momence booking: client email required');
      res.status(400).json({
        success: false,
        error: 'Client email is required',
      });
      return;
    }

    logger.info(`Booking Momence slot ${slotId} for ${clientData.email}`);

    const adapter = AdapterFactory.getAdapter('momence');
    const result = await adapter.bookSlot(clientData as ClientInfo, slotId);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`Momence booking failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`Momence booking successful: ${result.bookingId}`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Momence booking error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete booking',
      processingTimeMs: processingTime,
    });
  }
});

export default router;
