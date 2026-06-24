import { logger } from '../utils/logger';
import { IBookingAdapter, AvailabilityResponse, BookingResponseData, ClientInfo } from '../services/IBookingAdapter';
import { AdapterFactory, BookingPlatform } from '../services/AdapterFactory';
import {
  MOCK_STUDIO,
  getMockClassesByDateAndType,
  getMockClassById,
  simulateBooking,
} from './mockStudioData';

/**
 * Operating Mode for the platform
 */
export enum OperatingMode {
  DEMO = 'demo',
  LIVE = 'live',
}

/**
 * Studio Platform Configuration
 *
 * Controls whether the system runs in DEMO mode (mock data)
 * or LIVE mode (real platform adapters).
 */
export interface StudioPlatformConfig {
  mode: OperatingMode;
  platform: string;
  apiKey: string | null;
  isDemoMode: boolean;
  businessId?: string;
  username?: string;
  password?: string;
}

/**
 * Mock adapter that provides scheduling data in DEMO mode
 */
class MockStudioAdapter implements IBookingAdapter {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    try {
      logger.info(`[DEMO] Checking availability for ${classType} on ${date}`);

      const classes = getMockClassesByDateAndType(date, classType);

      if (classes.length === 0) {
        logger.warn(`[DEMO] No classes found for ${classType} on ${date}`);
        return {
          success: true,
          classId: classType,
          maxCapacity: 0,
          currentEnrollment: 0,
          availableSpots: 0,
          waitlistAvailable: false,
          error: 'No classes available for the specified date and type',
        };
      }

      // Return first available class
      const classInfo = classes[0];

      logger.info(
        `[DEMO] Found class: ${classInfo.name} with ${classInfo.currentEnrollment}/${classInfo.maxCapacity} enrollments`,
      );

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
    } catch (error) {
      logger.error(`[DEMO] Availability check failed:`, error as Error);

      return {
        success: false,
        classId: classType,
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: error instanceof Error ? error.message : 'Mock availability check failed',
      };
    }
  }

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    try {
      const email = clientInfo.email || clientInfo.customerEmail || '';

      if (!email) {
        logger.warn('[DEMO] Booking attempted with missing email');
        return {
          success: false,
          classId: slotId,
          error: 'Email is required',
        };
      }

      logger.info(`[DEMO] Booking slot ${slotId} for ${email}`);

      const mockClass = getMockClassById(slotId);

      if (!mockClass) {
        logger.warn(`[DEMO] Class ${slotId} not found in mock data`);
        return {
          success: false,
          classId: slotId,
          error: 'Class not found in mock data',
        };
      }

      const booking = simulateBooking(slotId);

      logger.info(`[DEMO] Booking confirmed: ${booking.confirmationNumber}`);

      return {
        success: true,
        classId: slotId,
        bookingId: booking.bookingId,
        confirmationNumber: booking.confirmationNumber,
      };
    } catch (error) {
      logger.error(`[DEMO] Booking failed:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Mock booking failed',
      };
    }
  }
}

/**
 * Platform Controller
 *
 * Manages DEMO vs LIVE mode based on environment configuration.
 * - DEMO mode: Uses MockStudioAdapter with local test data
 * - LIVE mode: Initializes platform-specific adapters (Mindbody, Arketa, WellnessLiving, Momence)
 */
export class PlatformController {
  private config: StudioPlatformConfig;
  private adapter: IBookingAdapter;
  private mockAdapter: MockStudioAdapter;

  constructor(config?: Partial<StudioPlatformConfig>) {
    this.mockAdapter = new MockStudioAdapter();

    // Determine operating mode from environment
    const envMode = (process.env.OPERATING_MODE || process.env.MODE || 'demo').toLowerCase();
    const isDemoMode = envMode === 'demo' || envMode === 'development' || envMode === 'test';

    const selectedPlatform = (process.env.STUDIO_PLATFORM || 'mindbody').toLowerCase();

    this.config = {
      mode: isDemoMode ? OperatingMode.DEMO : OperatingMode.LIVE,
      platform: isDemoMode ? 'mock' : selectedPlatform,
      apiKey: process.env.STUDIO_API_KEY || null,
      isDemoMode,
      businessId: process.env.MOMENCE_BUSINESS_ID,
      username: process.env.WL_USERNAME,
      password: process.env.WL_PASSWORD,
      ...config,
    };

    // Initialize adapter based on mode
    this.adapter = this.initializeAdapter();

    this.logInitialization();
  }

  /**
   * Initialize the appropriate adapter based on operating mode
   */
  private initializeAdapter(): IBookingAdapter {
    if (this.config.isDemoMode) {
      logger.info('Operating in DEMO mode. Using mock studio data.');
      return this.mockAdapter;
    }

    // LIVE mode: Initialize real platform adapter
    try {
      logger.info(`Initializing adapter for LIVE platform: ${this.config.platform}`);
      return AdapterFactory.getAdapter(this.config.platform);
    } catch (error) {
      logger.error(
        `Failed to initialize LIVE adapter for ${this.config.platform}:`,
        error as Error,
      );
      logger.warn('ERROR: Cannot continue in LIVE mode without working adapter.');
      throw new Error(
        `Failed to initialize ${this.config.platform} adapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check availability using configured adapter
   */
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    try {
      const mode = this.config.isDemoMode ? '[DEMO]' : `[LIVE:${this.config.platform.toUpperCase()}]`;
      logger.info(`${mode} Checking availability for ${classType} on ${date}`);

      const result = await this.adapter.checkAvailability(date, classType);

      if (!result.success) {
        logger.warn(`${mode} Availability check failed: ${result.error}`);
      } else {
        logger.info(`${mode} Availability check succeeded`);
      }

      return result;
    } catch (error) {
      logger.error(
        `${this.config.isDemoMode ? '[DEMO]' : '[LIVE]'} Availability check error:`,
        error as Error,
      );

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
   * Book a slot using configured adapter
   */
  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    try {
      const mode = this.config.isDemoMode ? '[DEMO]' : `[LIVE:${this.config.platform.toUpperCase()}]`;
      logger.info(`${mode} Booking slot ${slotId}`);

      const result = await this.adapter.bookSlot(clientInfo, slotId);

      if (!result.success) {
        logger.warn(`${mode} Booking failed: ${result.error}`);
      } else {
        logger.info(`${mode} Booking succeeded: ${result.bookingId}`);
      }

      return result;
    } catch (error) {
      logger.error(
        `${this.config.isDemoMode ? '[DEMO]' : '[LIVE]'} Booking error:`,
        error as Error,
      );

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Get current platform configuration
   */
  getConfig(): Readonly<StudioPlatformConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get operating mode
   */
  getMode(): OperatingMode {
    return this.config.mode;
  }

  /**
   * Check if running in DEMO mode
   */
  isDemoMode(): boolean {
    return this.config.isDemoMode;
  }

  /**
   * Check if running in LIVE mode
   */
  isLiveMode(): boolean {
    return !this.config.isDemoMode;
  }

  /**
   * Get configured adapter instance
   */
  getAdapter(): IBookingAdapter {
    return this.adapter;
  }

  /**
   * Get mock studio data (for DEMO mode)
   */
  getMockStudio() {
    return MOCK_STUDIO;
  }

  /**
   * Reset mock data (useful for testing in DEMO mode)
   */
  resetMockData(): void {
    if (!this.config.isDemoMode) {
      logger.warn('Cannot reset mock data: not in DEMO mode');
      return;
    }

    logger.info('[DEMO] Resetting mock studio data');
    const { resetMockStudioData } = require('./mockStudioData');
    resetMockStudioData();
  }

  /**
   * Switch operating mode (for development/testing)
   * WARNING: Only use in DEMO mode or for testing
   */
  switchMode(mode: OperatingMode): void {
    logger.warn(`Switching from ${this.config.mode} to ${mode}`);

    this.config.mode = mode;
    this.config.isDemoMode = mode === OperatingMode.DEMO;

    if (this.config.isDemoMode) {
      logger.info('Switched to DEMO mode - using mock studio data');
      this.adapter = this.mockAdapter;
    } else {
      logger.info(`Switched to LIVE mode - initializing ${this.config.platform} adapter`);
      try {
        this.adapter = AdapterFactory.getAdapter(this.config.platform);
        logger.info(`Successfully switched to LIVE mode with ${this.config.platform} adapter`);
      } catch (error) {
        logger.error(`Failed to initialize ${this.config.platform} adapter:`, error as Error);
        throw new Error(`Cannot switch to LIVE mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Switch to a different platform in LIVE mode (for testing/debugging)
   */
  switchPlatform(platform: string): void {
    if (this.config.isDemoMode) {
      logger.warn('Cannot switch platform in DEMO mode');
      throw new Error('Platform switching is only available in LIVE mode');
    }

    if (!Object.values(BookingPlatform).includes(platform as BookingPlatform)) {
      logger.error(`Cannot switch to unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
    }

    logger.info(`[LIVE] Switching platform from ${this.config.platform} to ${platform}`);
    this.config.platform = platform;

    try {
      this.adapter = AdapterFactory.getAdapter(platform);
      logger.info(`[LIVE] Successfully switched to ${platform} adapter`);
    } catch (error) {
      logger.error(`[LIVE] Failed to switch to ${platform} adapter:`, error as Error);
      throw new Error(`Failed to initialize ${platform} adapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log initialization status
   */
  private logInitialization(): void {
    const status = this.config.isDemoMode
      ? '🔧 DEMO MODE (Mock Studio Data - Development/Testing)'
      : `🚀 LIVE MODE (Platform: ${this.config.platform.toUpperCase()})`;

    const separator = '='.repeat(50);

    logger.info(separator);
    logger.info('Platform Controller Initialized');
    logger.info(`Mode: ${status}`);
    logger.info(`API Key: ${this.config.apiKey ? '✓ Configured' : '✗ Not configured'}`);

    if (this.config.isDemoMode) {
      logger.info(`Studio: ${MOCK_STUDIO.studioName}`);
      logger.info(`Address: ${MOCK_STUDIO.address}`);
      logger.info(`Available Classes: ${MOCK_STUDIO.classes.length}`);
    } else {
      logger.info(`Selected Platform: ${this.config.platform}`);
      logger.info(`Business ID: ${this.config.businessId ? '✓ Configured' : '✗ Not configured'}`);
    }

    logger.info(separator);
  }
}

/**
 * Singleton instance of PlatformController
 */
let platformControllerInstance: PlatformController | null = null;

/**
 * Get or create the singleton PlatformController instance
 */
export function getPlatformController(): PlatformController {
  if (!platformControllerInstance) {
    platformControllerInstance = new PlatformController();
  }
  return platformControllerInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetPlatformController(): void {
  platformControllerInstance = null;
}

/**
 * Export singleton for convenient access
 *
 * Automatically initializes based on:
 * - OPERATING_MODE env var: "demo" or "live" (default: "demo")
 * - STUDIO_PLATFORM env var: "mindbody", "arketa", "wellnessliving", "momence" (default: "mindbody")
 */
export const platformController = new PlatformController();
