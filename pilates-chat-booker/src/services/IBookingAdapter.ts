/**
 * Standard interface for all booking platform adapters.
 * All implementations must provide authentication, availability checking,
 * and slot booking capabilities following this contract.
 */

export interface AvailabilityRequest {
  date?: string;
  classType?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface AvailabilityResponse {
  success: boolean;
  classId: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount?: number;
  nextAvailableSlot?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ClientInfo {
  clientId?: string;
  firstName?: string;
  lastName?: string;
  customerName?: string;
  email: string;
  phoneNumber?: string;
  customerPhone?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface BookingResponseData {
  success: boolean;
  bookingId?: string;
  classId: string;
  confirmationNumber?: string;
  confirmationCode?: string;
  bookingUrl?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Standard Booking Adapter Interface
 *
 * All studio management platform adapters (Momence, WellnessLiving, Mindbody, etc.)
 * must implement this interface to provide a consistent booking experience.
 *
 * @example
 * class MyStudioAdapter implements IBookingAdapter {
 *   async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
 *     // Implementation
 *   }
 *
 *   async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
 *     // Implementation
 *   }
 * }
 */
export interface IBookingAdapter {
  /**
   * Check availability for a class on a given date and type.
   *
   * @param date - The date to check availability (ISO format: YYYY-MM-DD or flexible format)
   * @param classType - The type/category of class (e.g., 'Pilates', 'Yoga', or class ID)
   * @returns Promise resolving to availability response with capacity and enrollment info
   *
   * @example
   * const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');
   * if (availability.success) {
   *   console.log(`${availability.availableSpots} spots available`);
   * }
   */
  checkAvailability(date: string, classType: string): Promise<AvailabilityResponse>;

  /**
   * Book a slot for a client in a specific class/time slot.
   *
   * @param clientInfo - Object containing client details (name, email, phone, etc.)
   * @param slotId - Unique identifier for the class/slot to book
   * @returns Promise resolving to booking confirmation with booking ID and confirmation code
   *
   * @example
   * const booking = await adapter.bookSlot(
   *   { email: 'client@example.com', customerPhone: '555-0100' },
   *   'class-12345'
   * );
   * if (booking.success) {
   *   console.log(`Booked! Confirmation: ${booking.confirmationNumber}`);
   * }
   */
  bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData>;
}

/**
 * Factory type for creating booking adapter instances.
 * Adapters should export a create function following this signature.
 *
 * @example
 * export const createMyStudioAdapter = (config: any): MyStudioAdapter => {
 *   return new MyStudioAdapter(config);
 * };
 */
export type BookingAdapterFactory<T extends IBookingAdapter> = (...args: unknown[]) => T;

/**
 * Adapter Registry for managing multiple booking platform implementations.
 * Allows centralized lookup and initialization of adapters.
 */
export interface BookingAdapterRegistry {
  register(name: string, adapter: IBookingAdapter): void;
  get(name: string): IBookingAdapter | undefined;
  getAll(): Map<string, IBookingAdapter>;
  has(name: string): boolean;
}

/**
 * Adapter health/status interface for monitoring adapter state.
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
