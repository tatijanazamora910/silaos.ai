import { Router, Request, Response } from 'express';
import { AdapterFactory, BookingPlatform, AvailabilityRequest, ClientInfo } from '../services';
import { logger } from '../utils/logger';

const router = Router();

router.get('/platforms', (req: Request, res: Response): void => {
  try {
    logger.info('Listing supported booking platforms');

    const platforms = AdapterFactory.getSupportedPlatforms();

    res.status(200).json({
      success: true,
      platforms,
      platformCount: platforms.length,
    });
  } catch (error) {
    logger.error('Failed to list platforms:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve platform list',
    });
  }
});

router.post('/check-availability', (req: Request, res: Response): void => {
  const startTime = Date.now();

  try {
    logger.info('Received cross-platform availability check request');

    const { platform, date, classType } = req.body as Record<string, unknown>;

    if (!platform || typeof platform !== 'string') {
      logger.warn('Availability check missing platform parameter');
      res.status(400).json({
        success: false,
        error: 'Platform is required',
      });
      return;
    }

    if (!date || typeof date !== 'string') {
      logger.warn('Availability check missing date parameter');
      res.status(400).json({
        success: false,
        error: 'Date is required',
      });
      return;
    }

    if (!classType || typeof classType !== 'string') {
      logger.warn('Availability check missing classType parameter');
      res.status(400).json({
        success: false,
        error: 'Class type is required',
      });
      return;
    }

    if (!AdapterFactory.isSupported(platform)) {
      logger.warn(`Unsupported platform requested: ${platform}`);
      res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}. Supported: ${AdapterFactory.getSupportedPlatforms().join(', ')}`,
      });
      return;
    }

    logger.info(`Getting adapter for platform: ${platform}`);

    const adapter = AdapterFactory.getAdapter(platform);

    logger.info(`Checking availability on ${platform} for ${classType} on ${date}`);

    adapter
      .checkAvailability(date, classType)
      .then((result) => {
        const processingTime = Date.now() - startTime;

        if (!result.success) {
          logger.warn(`Availability check failed on ${platform}: ${result.error}`);
          res.status(500).json({
            success: false,
            platform,
            error: result.error,
            processingTimeMs: processingTime,
          });
          return;
        }

        logger.info(
          `Availability check successful on ${platform}: ${result.availableSpots} spots available`,
        );

        res.status(200).json({
          success: true,
          platform,
          data: result,
          processingTimeMs: processingTime,
        });
      })
      .catch((error) => {
        const processingTime = Date.now() - startTime;
        logger.error(
          `Availability check promise rejected on ${platform} after ${processingTime}ms:`,
          error as Error,
        );

        res.status(500).json({
          success: false,
          platform,
          error: `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processingTimeMs: processingTime,
        });
      });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Availability endpoint error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to process availability request',
      processingTimeMs: processingTime,
    });
  }
});

router.post('/book', (req: Request, res: Response): void => {
  const startTime = Date.now();

  try {
    logger.info('Received cross-platform booking request');

    const { platform, slotId, clientInfo } = req.body as Record<string, unknown>;

    if (!platform || typeof platform !== 'string') {
      logger.warn('Booking request missing platform parameter');
      res.status(400).json({
        success: false,
        error: 'Platform is required',
      });
      return;
    }

    if (!slotId || typeof slotId !== 'string') {
      logger.warn('Booking request missing slotId parameter');
      res.status(400).json({
        success: false,
        error: 'Slot ID is required',
      });
      return;
    }

    if (!clientInfo || typeof clientInfo !== 'object') {
      logger.warn('Booking request missing clientInfo parameter');
      res.status(400).json({
        success: false,
        error: 'Client information is required',
      });
      return;
    }

    const clientData = clientInfo as Record<string, unknown>;
    if (!clientData.email || typeof clientData.email !== 'string') {
      logger.warn('Client info missing email');
      res.status(400).json({
        success: false,
        error: 'Client email is required',
      });
      return;
    }

    if (!AdapterFactory.isSupported(platform)) {
      logger.warn(`Unsupported platform in booking request: ${platform}`);
      res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}. Supported: ${AdapterFactory.getSupportedPlatforms().join(', ')}`,
      });
      return;
    }

    logger.info(
      `Getting adapter for platform: ${platform} to book slot: ${slotId}`,
    );

    const adapter = AdapterFactory.getAdapter(platform);

    logger.info(`Booking on ${platform} for ${clientData.email}`);

    adapter
      .bookSlot(clientData as ClientInfo, slotId)
      .then((result) => {
        const processingTime = Date.now() - startTime;

        if (!result.success) {
          logger.warn(`Booking failed on ${platform}: ${result.error}`);
          res.status(400).json({
            success: false,
            platform,
            error: result.error,
            processingTimeMs: processingTime,
          });
          return;
        }

        logger.info(`Booking successful on ${platform}: ${result.bookingId}`);

        res.status(200).json({
          success: true,
          platform,
          data: result,
          processingTimeMs: processingTime,
        });
      })
      .catch((error) => {
        const processingTime = Date.now() - startTime;
        logger.error(
          `Booking promise rejected on ${platform} after ${processingTime}ms:`,
          error as Error,
        );

        res.status(500).json({
          success: false,
          platform,
          error: `Failed to complete booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processingTimeMs: processingTime,
        });
      });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Booking endpoint error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to process booking request',
      processingTimeMs: processingTime,
    });
  }
});

export default router;
