import { Router, Request, Response } from 'express';
import { platformController, ClientInfo } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get current platform configuration and status
 */
router.get('/status', (req: Request, res: Response): void => {
  try {
    logger.info('Platform status requested');

    const config = platformController.getConfig();
    const isDemo = platformController.isDemoMode();

    const mockStudio = isDemo ? platformController.getMockStudio() : null;

    res.status(200).json({
      success: true,
      platform: {
        mode: config.mode,
        isDemo: isDemo,
        isLive: !isDemo,
        name: config.platform,
        apiKeyConfigured: !!config.apiKey,
      },
      studio: isDemo
        ? {
            id: mockStudio?.studioId,
            name: mockStudio?.studioName,
            address: mockStudio?.address,
            phone: mockStudio?.phone,
            classCount: mockStudio?.classes.length,
          }
        : {
            platform: config.platform,
            businessId: config.businessId ? '✓ Configured' : '✗ Not configured',
          },
      environment: {
        operating_mode: process.env.OPERATING_MODE || 'demo',
        studio_platform: process.env.STUDIO_PLATFORM || 'mindbody',
      },
    });
  } catch (error) {
    logger.error('Failed to get platform status:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve platform status',
    });
  }
});

/**
 * Unified availability check endpoint
 * Works with both real and mock adapters
 */
router.post('/availability', (req: Request, res: Response): void => {
  const startTime = Date.now();

  try {
    logger.info('Platform availability check requested');

    const { date, classType } = req.body as Record<string, unknown>;

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

    const isDemo = platformController.isDemoMode();
    const mode = isDemo ? 'demo' : 'live';
    logger.info(`Checking availability via ${mode} adapter for ${classType} on ${date}`);

    platformController
      .checkAvailability(date, classType)
      .then((result) => {
        const processingTime = Date.now() - startTime;

        if (!result.success) {
          logger.warn(`Availability check failed: ${result.error}`);
          res.status(500).json({
            success: false,
            mode: platformController.isDemoMode() ? 'demo' : 'live',
            error: result.error,
            processingTimeMs: processingTime,
          });
          return;
        }

        logger.info(
          `Availability check successful: ${result.availableSpots} spots available`,
        );

        res.status(200).json({
          success: true,
          mode: platformController.isDemoMode() ? 'demo' : 'live',
          data: result,
          processingTimeMs: processingTime,
        });
      })
      .catch((error) => {
        const processingTime = Date.now() - startTime;
        logger.error(`Availability check error after ${processingTime}ms:`, error as Error);

        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Availability check failed',
          processingTimeMs: processingTime,
        });
      });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Platform availability endpoint error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to process availability request',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Unified booking endpoint
 * Works with both real and mock adapters
 */
router.post('/book', (req: Request, res: Response): void => {
  const startTime = Date.now();

  try {
    logger.info('Platform booking requested');

    const { slotId, clientInfo } = req.body as Record<string, unknown>;

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

    const isDemo = platformController.isDemoMode();
    const mode = isDemo ? 'demo' : 'live';
    logger.info(`Booking via ${mode} adapter for slot ${slotId}`);

    platformController
      .bookSlot(clientData as ClientInfo, slotId)
      .then((result) => {
        const processingTime = Date.now() - startTime;

        if (!result.success) {
          logger.warn(`Booking failed: ${result.error}`);
          res.status(400).json({
            success: false,
            mode: platformController.isDemoMode() ? 'demo' : 'live',
            error: result.error,
            processingTimeMs: processingTime,
          });
          return;
        }

        logger.info(`Booking successful: ${result.bookingId}`);

        res.status(200).json({
          success: true,
          mode: platformController.isDemoMode() ? 'demo' : 'live',
          data: result,
          processingTimeMs: processingTime,
        });
      })
      .catch((error) => {
        const processingTime = Date.now() - startTime;
        logger.error(`Booking error after ${processingTime}ms:`, error as Error);

        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Booking failed',
          processingTimeMs: processingTime,
        });
      });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Platform booking endpoint error after ${processingTime}ms:`, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to process booking request',
      processingTimeMs: processingTime,
    });
  }
});

/**
 * Get mock studio data (DEMO mode only)
 */
router.get('/demo-studio', (req: Request, res: Response): void => {
  try {
    if (!platformController.isDemoMode()) {
      logger.warn('Mock studio data requested while in LIVE mode');
      res.status(403).json({
        success: false,
        error: 'Mock studio data is only available in DEMO mode',
      });
      return;
    }

    logger.info('[DEMO] Studio data requested');

    const mockStudio = platformController.getMockStudio();

    res.status(200).json({
      success: true,
      mode: 'demo',
      studio: mockStudio,
    });
  } catch (error) {
    logger.error('Failed to retrieve DEMO studio data:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve DEMO studio data',
    });
  }
});

/**
 * Reset mock data (DEMO mode only)
 */
router.post('/demo-studio/reset', (req: Request, res: Response): void => {
  try {
    if (!platformController.isDemoMode()) {
      logger.warn('DEMO data reset requested while in LIVE mode');
      res.status(403).json({
        success: false,
        error: 'DEMO data reset is only available in DEMO mode',
      });
      return;
    }

    logger.info('[DEMO] Resetting studio data');

    platformController.resetMockData();

    res.status(200).json({
      success: true,
      mode: 'demo',
      message: 'DEMO studio data reset successfully',
    });
  } catch (error) {
    logger.error('Failed to reset DEMO studio data:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset DEMO studio data',
    });
  }
});

/**
 * Switch operating mode (DEMO ↔ LIVE)
 * Development/testing only
 */
router.post('/mode/switch', (req: Request, res: Response): void => {
  try {
    const { mode } = req.body as Record<string, unknown>;

    if (!mode || typeof mode !== 'string') {
      logger.warn('Mode switch requested without mode parameter');
      res.status(400).json({
        success: false,
        error: 'Mode is required (demo or live)',
      });
      return;
    }

    const targetMode = mode.toLowerCase() as 'demo' | 'live';

    if (targetMode !== 'demo' && targetMode !== 'live') {
      logger.warn(`Invalid mode requested: ${mode}`);
      res.status(400).json({
        success: false,
        error: 'Mode must be "demo" or "live"',
      });
      return;
    }

    logger.info(`Switching operating mode to ${targetMode}`);

    const modeEnum = targetMode === 'demo' ? 'demo' : 'live';
    platformController.switchMode(modeEnum as any);

    const config = platformController.getConfig();

    res.status(200).json({
      success: true,
      message: `Switched to ${targetMode.toUpperCase()} mode`,
      config: {
        mode: config.mode,
        platform: config.platform,
      },
    });
  } catch (error) {
    logger.error('Failed to switch mode:', error as Error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to switch mode',
    });
  }
});

/**
 * Switch platform in LIVE mode (development debugging)
 */
router.post('/live-platform/switch', (req: Request, res: Response): void => {
  try {
    if (platformController.isDemoMode()) {
      logger.warn('Platform switch requested while in DEMO mode');
      res.status(403).json({
        success: false,
        error: 'Platform switching only available in LIVE mode',
      });
      return;
    }

    const { platform } = req.body as Record<string, unknown>;

    if (!platform || typeof platform !== 'string') {
      logger.warn('[LIVE] Platform switch requested without platform parameter');
      res.status(400).json({
        success: false,
        error: 'Platform name is required',
      });
      return;
    }

    logger.info(`[LIVE] Attempting to switch platform to ${platform}`);

    platformController.switchPlatform(platform);

    const config = platformController.getConfig();

    res.status(200).json({
      success: true,
      message: `Switched to ${platform} adapter`,
      mode: 'live',
      platform: config.platform,
    });
  } catch (error) {
    logger.error('[LIVE] Failed to switch platform:', error as Error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to switch platform',
    });
  }
});

export default router;
