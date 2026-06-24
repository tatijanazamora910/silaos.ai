/**
 * Booking Router Service
 *
 * Unified routing layer that handles:
 * - DEMO mode: returns mock data from MockStudioAdapter
 * - LIVE mode: routes to platform-specific adapters (Mindbody, Arketa, WellnessLiving, Momence)
 * - Auto-detects mode from OPERATING_MODE or MODE environment variables
 * - Supports runtime mode and platform switching
 *
 * Usage:
 * const router = getBookingRouter();
 * const availability = await router.checkAvailability('2026-06-25', 'Pilates');
 * const booking = await router.bookSlot(clientInfo, 'class-123');
 */

import { IBookingAdapter, ClientInfo, AvailabilityResponse, BookingResponseData } from './IBookingAdapter';
import { AdapterFactory } from './AdapterFactory';
import { getMockClassesByDateAndType, getMockClassById, simulateBooking } from '../config/mockStudioData';
import { logger } from '../utils/logger';

/**
 * Operating mode for the booking service
 */
export enum BookingMode {
  DEMO = 'demo',
  LIVE = 'live',
}

/**
 * Booking Router - Routes availability checks and bookings based on operating mode
 *
 * In DEMO mode: Uses MockStudioAdapter with local mock data (data/mockSchedule.json)
 * In LIVE mode: Routes to platform adapters via AdapterFactory based on STUDIO_PLATFORM env var
 */
/**
 * Inline mock adapter implementation using mockStudioData
 */
const mockAdapter: IBookingAdapter = {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    logger.info(`[DEMO] Checking availability for ${classType} on ${date}`);
    const classes = getMockClassesByDateAndType(date, classType);

    if (classes.length === 0) {
      return {
        success: true,
        classId: classType,
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: 'No classes available',
      };
    }

    const classInfo = classes[0];
    return {
      success: true,
      classId: classInfo.id,
      maxCapacity: classInfo.maxCapacity,
      currentEnrollment: classInfo.currentEnrollment,
      availableSpots: Math.max(0, classInfo.maxCapacity - classInfo.currentEnrollment),
      waitlistAvailable: classInfo.waitlistCount > 0,
      waitlistCount: classInfo.waitlistCount,
      nextAvailableSlot: classInfo.startTime,
    };
  },

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    const email = clientInfo.email || '';
    if (!email) {
      return {
        success: false,
        classId: slotId,
        error: 'Email is required',
      };
    }

    const mockClass = getMockClassById(slotId);
    if (!mockClass) {
      return {
        success: false,
        classId: slotId,
        error: 'Class not found',
      };
    }

    const booking = simulateBooking(slotId);
    return {
      success: true,
      bookingId: booking.bookingId,
      classId: slotId,
      confirmationNumber: booking.confirmationNumber,
    };
  },
};

export class BookingRouter implements IBookingAdapter {
  private mode: BookingMode;
  private platform: string;
  private activeAdapter: IBookingAdapter;

  constructor() {
    // Determine mode from environment (supports both OPERATING_MODE and MODE)
    const modeEnv = (process.env.OPERATING_MODE || process.env.MODE || 'demo').toLowerCase();
    this.mode = modeEnv === 'live' ? BookingMode.LIVE : BookingMode.DEMO;

    // Get studio platform (used only in LIVE mode)
    this.platform = (process.env.STUDIO_PLATFORM || 'mindbody').toLowerCase();

    // Initialize active adapter based on mode
    if (this.mode === BookingMode.DEMO) {
      this.activeAdapter = mockAdapter;
      logger.info('✅ [DEMO] BookingRouter initialized - using mock data');
    } else {
      this.activeAdapter = AdapterFactory.getAdapter(this.platform);
      logger.info(`✅ [LIVE:${this.platform.toUpperCase()}] BookingRouter initialized`);
    }
  }

  /**
   * Get current operating mode
   */
  getMode(): BookingMode {
    return this.mode;
  }

  /**
   * Get current platform
   */
  getPlatform(): string {
    return this.platform;
  }

  /**
   * Check if running in DEMO mode
   */
  isDemoMode(): boolean {
    return this.mode === BookingMode.DEMO;
  }

  /**
   * Check if running in LIVE mode
   */
  isLiveMode(): boolean {
    return this.mode === BookingMode.LIVE;
  }

  /**
   * Check availability for a class
   *
   * In DEMO mode: Returns mock data from mockSchedule.json via MockStudioAdapter
   * In LIVE mode: Calls the appropriate platform adapter (Mindbody/Arketa/WellnessLiving/Momence)
   *
   * @param date - Class date (YYYY-MM-DD or flexible format)
   * @param classType - Type of class (e.g., 'Pilates', 'Mat Pilates', 'Reformer')
   * @returns Promise resolving to availability response
   */
  async checkAvailability(
    date: string,
    classType: string,
  ): Promise<AvailabilityResponse> {
    try {
      if (!date || !classType) {
        logger.warn('[BookingRouter] checkAvailability called with missing parameters');
        return {
          success: false,
          classId: classType,
          maxCapacity: 0,
          currentEnrollment: 0,
          availableSpots: 0,
          waitlistAvailable: false,
          error: 'Date and class type are required',
        };
      }

      const modePrefix = this.mode === BookingMode.DEMO ? '[DEMO]' : `[LIVE:${this.platform.toUpperCase()}]`;
      logger.info(`${modePrefix} Checking availability for ${classType} on ${date}`);

      // Delegate to active adapter (mock or platform-specific)
      const result = await this.activeAdapter.checkAvailability(date, classType);

      if (result.success) {
        logger.info(`${modePrefix} Found availability: ${result.availableSpots} spot(s)`);
      } else {
        logger.warn(`${modePrefix} Availability check error: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error(`[BookingRouter] checkAvailability error:`, error as Error);

      return {
        success: false,
        classId: classType,
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: error instanceof Error ? error.message : 'Availability check failed',
      };
    }
  }

  /**
   * Book a class slot for a client
   *
   * In DEMO mode: Simulates booking with mock confirmation
   * In LIVE mode: Creates actual booking in the platform (Mindbody/Arketa/WellnessLiving/Momence)
   *
   * @param clientInfo - Client details (name, email, phone)
   * @param slotId - Unique identifier for the class slot
   * @returns Promise resolving to booking response
   */
  async bookSlot(
    clientInfo: ClientInfo,
    slotId: string,
  ): Promise<BookingResponseData> {
    try {
      if (!slotId || !clientInfo.email) {
        logger.warn('[BookingRouter] bookSlot called with missing parameters');
        return {
          success: false,
          classId: slotId,
          error: 'Slot ID and email are required',
        };
      }

      const modePrefix = this.mode === BookingMode.DEMO ? '[DEMO]' : `[LIVE:${this.platform.toUpperCase()}]`;
      logger.info(`${modePrefix} Processing booking for ${clientInfo.email} on slot ${slotId}`);

      // Delegate to active adapter (mock or platform-specific)
      const result = await this.activeAdapter.bookSlot(clientInfo, slotId);

      if (result.success) {
        logger.info(`${modePrefix} Booking successful: ${result.confirmationNumber || result.bookingId}`);
      } else {
        logger.warn(`${modePrefix} Booking error: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error(`[BookingRouter] bookSlot error:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Switch operating mode (DEMO ↔ LIVE)
   * Useful for testing or switching between modes at runtime
   *
   * @param newMode - Target mode (DEMO or LIVE)
   */
  switchMode(newMode: BookingMode): void {
    if (this.mode === newMode) {
      logger.warn(`[BookingRouter] Already in ${newMode} mode`);
      return;
    }

    const oldMode = this.mode;
    this.mode = newMode;

    if (newMode === BookingMode.DEMO) {
      this.activeAdapter = mockAdapter;
      logger.info(`🔄 [BookingRouter] Switched from ${oldMode} to DEMO mode - using mock data`);
    } else {
      this.activeAdapter = AdapterFactory.getAdapter(this.platform);
      logger.info(`🔄 [BookingRouter] Switched from ${oldMode} to LIVE mode - using ${this.platform.toUpperCase()} adapter`);
    }
  }

  /**
   * Switch platform (only in LIVE mode)
   * Supported platforms: mindbody, arketa, wellnessliving, momence
   *
   * @param platform - Target platform name
   * @throws Error if in DEMO mode
   */
  switchPlatform(platform: string): void {
    if (this.mode !== BookingMode.LIVE) {
      logger.warn('[BookingRouter] Cannot switch platform in DEMO mode');
      return;
    }

    const lowerPlatform = platform.toLowerCase();
    const validPlatforms = ['mindbody', 'arketa', 'wellnessliving', 'momence'];

    if (!validPlatforms.includes(lowerPlatform)) {
      logger.error(`[BookingRouter] Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`);
      return;
    }

    if (this.platform === lowerPlatform) {
      logger.warn(`[BookingRouter] Already using ${lowerPlatform} platform`);
      return;
    }

    const oldPlatform = this.platform;
    this.platform = lowerPlatform;
    this.activeAdapter = AdapterFactory.getAdapter(lowerPlatform);

    logger.info(`🔄 [BookingRouter] Switched from ${oldPlatform.toUpperCase()} to ${lowerPlatform.toUpperCase()} platform`);
  }

  /**
   * Get status information about the current routing configuration
   */
  getStatus(): {
    mode: BookingMode;
    platform: string;
    isDemo: boolean;
    isLive: boolean;
  } {
    return {
      mode: this.mode,
      platform: this.platform,
      isDemo: this.isDemoMode(),
      isLive: this.isLiveMode(),
    };
  }
}

/**
 * Singleton instance of BookingRouter
 * Ensures only one router instance exists throughout the application
 */
let routerInstance: BookingRouter | null = null;

/**
 * Get or create the BookingRouter singleton
 * @returns BookingRouter instance
 */
export const getBookingRouter = (): BookingRouter => {
  if (!routerInstance) {
    routerInstance = new BookingRouter();
  }
  return routerInstance;
};

/**
 * Reset the singleton (useful for testing or mode switching)
 * @internal
 */
export const resetBookingRouter = (): void => {
  routerInstance = null;
};

/**
 * Export singleton instance for direct access
 */
export const bookingRouter = getBookingRouter();
