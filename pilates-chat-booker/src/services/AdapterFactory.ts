import { logger } from '../utils/logger';
import { config } from '../config';
import {
  IBookingAdapter,
  AvailabilityRequest,
  AvailabilityResponse,
  ClientInfo,
  BookingResponseData,
} from './IBookingAdapter';
import { MomenceAdapter, createMomenceAdapter } from './adapters/MomenceAdapter';
import { WellnessLivingAdapter, createWellnessLivingAdapter } from './adapters/WellnessLivingAdapter';
import { MindbodyAdapter } from './adapters/MindbodyAdapter';
import { ArketaAdapter } from './adapters/ArketaAdapter';

/**
 * Supported booking platform identifiers.
 * Maps platform name strings to their adapter implementations.
 */
export enum BookingPlatform {
  MOMENCE = 'momence',
  WELLNESS_LIVING = 'wellnessliving',
  MINDBODY = 'mindbody',
  ARKETA = 'arketa',
}


/**
 * Factory for creating and retrieving booking adapters.
 * Provides a centralized point for adapter instantiation based on platform.
 *
 * Supports:
 * - momence: Momence booking platform (API key + Business ID required)
 * - wellnessliving: WellnessLiving platform (Username + Password required)
 * - mindbody: Mindbody by Zenoti (API key required)
 * - arketa: Arketa platform (webhook-based)
 */
export class AdapterFactory {
  private static adapters: Map<BookingPlatform, IBookingAdapter> = new Map();

  /**
   * Get or create an adapter for the specified platform.
   *
   * @param platform - Platform identifier (case-insensitive)
   * @returns IBookingAdapter instance for the platform
   * @throws Error if platform is not supported or initialization fails
   *
   * @example
   * const momenceAdapter = AdapterFactory.getAdapter('momence');
   * const availability = await momenceAdapter.checkAvailability('2026-06-25', 'Pilates');
   */
  static getAdapter(platform: string): IBookingAdapter {
    if (!platform || platform.trim().length === 0) {
      logger.error('AdapterFactory.getAdapter called with empty platform string');
      throw new Error('Platform name is required');
    }

    const normalizedPlatform = platform.toLowerCase().trim();

    try {
      switch (normalizedPlatform) {
        case BookingPlatform.MOMENCE:
          return this.getMomenceAdapter();

        case BookingPlatform.WELLNESS_LIVING:
          return this.getWellnessLivingAdapter();

        case BookingPlatform.MINDBODY:
          return this.getMindbodyAdapter();

        case BookingPlatform.ARKETA:
          return this.getArketaAdapter();

        default:
          logger.error(`Unsupported booking platform: ${normalizedPlatform}`);
          throw new Error(
            `Unsupported booking platform: ${normalizedPlatform}. ` +
              `Supported platforms: ${Object.values(BookingPlatform).join(', ')}`,
          );
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to get adapter for platform '${normalizedPlatform}':`, error);
        throw error;
      }
      throw new Error(`Unknown error occurred while loading adapter for '${normalizedPlatform}'`);
    }
  }

  /**
   * Get Momence adapter instance.
   * Creates new instance on first call, returns cached instance on subsequent calls.
   */
  private static getMomenceAdapter(): MomenceAdapter {
    const cacheKey = BookingPlatform.MOMENCE;

    if (!this.adapters.has(cacheKey)) {
      try {
        logger.info('Initializing Momence adapter');

        const adapter = createMomenceAdapter(
          config.momence.api_key,
          config.momence.business_id,
        );

        this.adapters.set(cacheKey, adapter);
        logger.info('Momence adapter initialized and cached');
      } catch (error) {
        logger.error('Failed to initialize Momence adapter:', error as Error);
        throw new Error(
          `Momence adapter initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return this.adapters.get(cacheKey) as MomenceAdapter;
  }

  /**
   * Get WellnessLiving adapter instance.
   * Creates new instance on first call, returns cached instance on subsequent calls.
   */
  private static getWellnessLivingAdapter(): WellnessLivingAdapter {
    const cacheKey = BookingPlatform.WELLNESS_LIVING;

    if (!this.adapters.has(cacheKey)) {
      try {
        logger.info('Initializing WellnessLiving adapter');

        const adapter = createWellnessLivingAdapter(
          config.wellnessLiving.username,
          config.wellnessLiving.password,
        );

        this.adapters.set(cacheKey, adapter);
        logger.info('WellnessLiving adapter initialized and cached');
      } catch (error) {
        logger.error('Failed to initialize WellnessLiving adapter:', error as Error);
        throw new Error(
          `WellnessLiving adapter initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return this.adapters.get(cacheKey) as WellnessLivingAdapter;
  }

  /**
   * Get Mindbody adapter instance.
   * Creates new instance on first call, returns cached instance on subsequent calls.
   */
  private static getMindbodyAdapter(): MindbodyAdapter {
    const cacheKey = BookingPlatform.MINDBODY;

    if (!this.adapters.has(cacheKey)) {
      try {
        logger.info('Initializing Mindbody adapter');

        const adapter = new MindbodyAdapter(config.mindbody.api_key);

        this.adapters.set(cacheKey, adapter);
        logger.info('Mindbody adapter initialized and cached');
      } catch (error) {
        logger.error('Failed to initialize Mindbody adapter:', error as Error);
        throw new Error(
          `Mindbody adapter initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return this.adapters.get(cacheKey) as MindbodyAdapter;
  }

  /**
   * Get Arketa adapter instance.
   * Creates new instance on first call, returns cached instance on subsequent calls.
   */
  private static getArketaAdapter(): ArketaAdapter {
    const cacheKey = BookingPlatform.ARKETA;

    if (!this.adapters.has(cacheKey)) {
      try {
        logger.info('Initializing Arketa adapter');

        // Note: Arketa adapter requires API key (placeholder for now)
        const adapter = new ArketaAdapter('arketa-api-key');

        this.adapters.set(cacheKey, adapter);
        logger.info('Arketa adapter initialized and cached');
      } catch (error) {
        logger.error('Failed to initialize Arketa adapter:', error as Error);
        throw new Error(
          `Arketa adapter initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return this.adapters.get(cacheKey) as ArketaAdapter;
  }

  /**
   * Clear adapter cache. Useful for testing or forcing adapter reinitialization.
   */
  static clearCache(): void {
    logger.info(`Clearing adapter cache (${this.adapters.size} adapters)`);
    this.adapters.clear();
  }

  /**
   * Get list of all supported platforms.
   */
  static getSupportedPlatforms(): string[] {
    return Object.values(BookingPlatform);
  }

  /**
   * Check if a platform is supported.
   */
  static isSupported(platform: string): boolean {
    const normalized = platform.toLowerCase().trim();
    return Object.values(BookingPlatform).includes(normalized as BookingPlatform);
  }
}

/**
 * Convenience function for getting an adapter.
 * Direct usage of AdapterFactory.getAdapter() is recommended for type safety.
 *
 * @param platform - Platform identifier (case-insensitive)
 * @returns IBookingAdapter instance
 * @throws Error if platform is not supported
 *
 * @example
 * const adapter = getAdapter('momence');
 * const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');
 */
export function getAdapter(platform: string): IBookingAdapter {
  return AdapterFactory.getAdapter(platform);
}

/**
 * Get all supported platform names.
 *
 * @returns Array of supported platform identifiers
 *
 * @example
 * const platforms = getSupportedPlatforms();
 * console.log(platforms); // ['momence', 'wellnessliving', 'mindbody', 'arketa']
 */
export function getSupportedPlatforms(): string[] {
  return AdapterFactory.getSupportedPlatforms();
}
