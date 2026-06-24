/**
 * Pilates Chat Booker - Centralized Type Definitions
 *
 * All TypeScript interfaces and types are defined here for consistency
 * and easy discoverability across the codebase.
 */

// ============================================================================
// BOOKING ADAPTER INTERFACE
// ============================================================================

/**
 * Standard interface that all booking platform adapters must implement.
 * Ensures consistent API across Mindbody, Arketa, WellnessLiving, Momence, etc.
 *
 * @example
 * class MindbodyAdapter implements IBookingAdapter {
 *   async checkAvailability(date: string): Promise<AvailabilityResponse> { ... }
 *   async bookClass(slotId: string, clientDetails: ClientDetails): Promise<BookingResponse> { ... }
 * }
 */
export interface IBookingAdapter {
  /**
   * Check availability for a class on a given date and type.
   *
   * @param date - Class date in ISO format (YYYY-MM-DD) or flexible format
   * @param classType - Type of class (e.g., 'Pilates', 'Mat Pilates', 'Reformer')
   * @returns Promise resolving to availability response with capacity and enrollment info
   *
   * @example
   * const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');
   * if (availability.success) {
   *   console.log(`${availability.availableSpots} spots available`);
   * }
   */
  checkAvailability(
    date: string,
    classType: string,
  ): Promise<AvailabilityResponse>;

  /**
   * Book a class slot for a client.
   *
   * @param clientInfo - Client information (name, email, phone, etc.)
   * @param slotId - Unique identifier for the class slot to book
   * @returns Promise resolving to booking confirmation with booking ID and confirmation number
   *
   * @example
   * const booking = await adapter.bookSlot(
   *   {
   *     email: 'student@example.com',
   *     firstName: 'Jane',
   *     lastName: 'Smith',
   *     phoneNumber: '555-0100'
   *   },
   *   'class-123'
   * );
   * if (booking.success) {
   *   console.log(`Booked! Confirmation: ${booking.confirmationNumber}`);
   * }
   */
  bookSlot(
    clientInfo: ClientDetails,
    slotId: string,
  ): Promise<BookingResponse>;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Client details for booking operations
 */
export interface ClientDetails {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  customerPhone?: string;
  customerName?: string;
  clientId?: string;
  [key: string]: unknown;
}

/**
 * Availability request parameters
 */
export interface AvailabilityRequest {
  date?: string;
  classType?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Class information returned in availability response
 */
export interface ClassInfo {
  id: string;
  name: string;
  classType: string;
  instructorName?: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount?: number;
  price?: number;
  difficulty?: string;
  [key: string]: unknown;
}

/**
 * Response from checkAvailability method
 */
export interface AvailabilityResponse {
  success: boolean;
  date?: string;
  classes?: ClassInfo[];
  classId?: string;
  maxCapacity?: number;
  currentEnrollment?: number;
  availableSpots?: number;
  waitlistAvailable?: boolean;
  waitlistCount?: number;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Response from bookClass method
 */
export interface BookingResponse {
  success: boolean;
  classId?: string;
  bookingId?: string;
  confirmationNumber?: string;
  confirmationCode?: string;
  bookingUrl?: string;
  bookedAt?: string;
  classTime?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/**
 * Supported booking platforms
 */
export enum BookingPlatform {
  MINDBODY = 'mindbody',
  ARKETA = 'arketa',
  WELLNESSLIVING = 'wellnessliving',
  MOMENCE = 'momence',
}

/**
 * Operating mode for the booking service
 */
export enum OperatingMode {
  DEMO = 'demo',
  LIVE = 'live',
}

/**
 * Studio platform configuration
 */
export interface StudioConfig {
  mode: OperatingMode;
  platform: BookingPlatform | string;
  apiKey?: string;
  businessId?: string;
  username?: string;
  password?: string;
  [key: string]: unknown;
}

// ============================================================================
// SESSION TYPES (Platform-specific)
// ============================================================================

/**
 * WellnessLiving session data
 */
export interface WellnessLivingSession {
  sessionToken?: string;
  userId?: string;
  authenticated: boolean;
  authenticatedAt?: string;
  expiresAt?: string;
}

/**
 * Adapter health status for monitoring
 */
export interface AdapterHealthStatus {
  name: string;
  healthy: boolean;
  lastCheck: string;
  uptime: number;
  errorCount: number;
  successCount: number;
  failureReason?: string;
}

/**
 * Adapter registry interface for managing multiple adapter instances
 */
export interface BookingAdapterRegistry {
  register(name: string, adapter: IBookingAdapter): void;
  get(name: string): IBookingAdapter | undefined;
  getAll(): Map<string, IBookingAdapter>;
  has(name: string): boolean;
  getHealth(name: string): AdapterHealthStatus | undefined;
  recordSuccess(name: string): void;
  recordError(name: string, error: Error): void;
}

// ============================================================================
// FACTORY TYPES
// ============================================================================

/**
 * Factory function type for creating adapter instances
 */
export type AdapterFactory<T extends IBookingAdapter> = (
  ...args: unknown[]
) => T;

/**
 * Adapter creation config passed to factory
 */
export interface AdapterConfig {
  apiKey?: string;
  businessId?: string;
  username?: string;
  password?: string;
  [key: string]: unknown;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Booking operation error
 */
export class BookingError extends Error {
  constructor(
    message: string,
    public platform?: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BookingError {
  constructor(message: string, platform?: string) {
    super(message, platform, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * API connectivity error
 */
export class ConnectivityError extends BookingError {
  constructor(message: string, platform?: string) {
    super(message, platform, 'CONNECTIVITY_ERROR');
    this.name = 'ConnectivityError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends BookingError {
  constructor(message: string, platform?: string) {
    super(message, platform, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// ============================================================================
// BOOKING CONTEXT (for middleware/handlers)
// ============================================================================

/**
 * Booking context for request handlers
 */
export interface BookingContext {
  mode: OperatingMode;
  platform: BookingPlatform | string;
  adapter: IBookingAdapter;
  requestId?: string;
  userId?: string;
  timestamp: Date;
  [key: string]: unknown;
}
