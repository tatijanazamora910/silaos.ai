import { Router, Request, Response } from 'express';
import { AdapterFactory, ClientInfo, WellnessLivingAdapter } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Helper to get WellnessLiving adapter with type assertion
 * WellnessLiving adapter has session management methods not in the base interface
 */
const getWellnessAdapter = (): WellnessLivingAdapter => {
  const adapter = AdapterFactory.getAdapter('wellnessliving');
  if (!(adapter instanceof WellnessLivingAdapter)) {
    throw new Error('Failed to retrieve WellnessLiving adapter');
  }
  return adapter;
};

/**
 * Create a new WellnessLiving session
 * WellnessLiving requires session-based authentication
 */
router.post('/authenticate', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    logger.info('Received WellnessLiving authentication request');

    const wellnessAdapter = getWellnessAdapter();
    const success = await wellnessAdapter.createSession();

    const processingTime = Date.now() - startTime;

    if (!success) {
      logger.warn(`WellnessLiving authentication failed after ${processingTime}ms`);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        processingTimeMs: processingTime,
      });
      return;
    }

    const sessionInfo = wellnessAdapter.getSessionInfo();

    logger.info(`WellnessLiving session authenticated in ${processingTime}ms`);

    res.status(200).json({
      success: true,
      session: sessionInfo,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(
      `WellnessLiving authentication endpoint error after ${processingTime}ms:`,
      error as Error,
    );

    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with WellnessLiving',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Check WellnessLiving availability
 * Uses the WellnessLiving adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/check-availability', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { date, classType } = req.body as Record<string, unknown>;

    if (!date || typeof date !== 'string') {
      logger.warn('WellnessLiving availability check missing date parameter');
      res.status(400).json({
        success: false,
        error: 'Date is required',
      });
      return;
    }

    if (!classType || typeof classType !== 'string') {
      logger.warn('WellnessLiving availability check missing classType parameter');
      res.status(400).json({
        success: false,
        error: 'Class type is required',
      });
      return;
    }

    logger.info(`Checking WellnessLiving availability for ${classType} on ${date}`);

    const adapter = AdapterFactory.getAdapter('wellnessliving');
    const result = await adapter.checkAvailability(date, classType);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`WellnessLiving availability check failed: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`WellnessLiving availability check successful: ${result.availableSpots} spots`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`WellnessLiving availability check error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Book a WellnessLiving class
 * Uses the WellnessLiving adapter via AdapterFactory which implements IBookingAdapter
 */
router.post('/book', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { slotId, clientInfo } = req.body as Record<string, unknown>;

    if (!slotId || typeof slotId !== 'string') {
      logger.warn('WellnessLiving booking missing slotId parameter');
      res.status(400).json({
        success: false,
        error: 'Slot ID is required',
      });
      return;
    }

    if (!clientInfo || typeof clientInfo !== 'object') {
      logger.warn('WellnessLiving booking missing clientInfo parameter');
      res.status(400).json({
        success: false,
        error: 'Client information is required',
      });
      return;
    }

    const clientData = clientInfo as Record<string, unknown>;
    if (!clientData.email || typeof clientData.email !== 'string') {
      logger.warn('WellnessLiving booking: client email required');
      res.status(400).json({
        success: false,
        error: 'Client email is required',
      });
      return;
    }

    logger.info(`Booking WellnessLiving slot ${slotId} for ${clientData.email}`);

    const adapter = AdapterFactory.getAdapter('wellnessliving');
    const result = await adapter.bookSlot(clientData as ClientInfo, slotId);

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`WellnessLiving booking failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
        processingTimeMs: processingTime,
      });
      return;
    }

    logger.info(`WellnessLiving booking successful: ${result.bookingId}`);

    res.status(200).json({
      success: true,
      data: result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`WellnessLiving booking error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete booking',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Get current WellnessLiving session info
 */
router.get('/session', (req: Request, res: Response): void => {
  try {
    logger.info('Session info requested');
    const wellnessAdapter = getWellnessAdapter();
    const sessionInfo = wellnessAdapter.getSessionInfo();

    res.status(200).json({
      success: true,
      session: sessionInfo,
    });
  } catch (error) {
    logger.error('Failed to retrieve session info:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session info',
    });
  }
});

/**
 * Clear WellnessLiving session
 */
router.post('/logout', (req: Request, res: Response): void => {
  try {
    logger.info('WellnessLiving logout requested');
    const wellnessAdapter = getWellnessAdapter();
    wellnessAdapter.clearSession();

    res.status(200).json({
      success: true,
      message: 'Session cleared',
    });
  } catch (error) {
    logger.error('Failed to clear session:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear session',
    });
  }
});

export default router;
