/**
 * Booking Adapter Interface and Types
 * All platform adapters implement IBookingAdapter for a consistent interface
 */
export {
  IBookingAdapter,
  AvailabilityRequest,
  AvailabilityResponse,
  ClientInfo,
  BookingResponseData,
  BookingAdapterFactory,
  BookingAdapterRegistry,
  AdapterHealthStatus,
} from './IBookingAdapter';

/**
 * Adapter Registry for managing multiple adapter instances
 */
export { BookingAdapterRegistryImpl, adapterRegistry } from './adapterRegistry';

/**
 * Adapter Factory and Centralized Platform Support
 * Use AdapterFactory.getAdapter(platform) to get any supported adapter
 */
export {
  AdapterFactory,
  BookingPlatform,
  getAdapter,
  getSupportedPlatforms,
} from './AdapterFactory';

/**
 * Platform-Specific Adapter Implementations
 * All implement IBookingAdapter interface
 */
export {
  MindbodyAdapter,
  createMindbodyAdapter,
  ArketaAdapter,
  createArketaAdapter,
  WellnessLivingAdapter,
  createWellnessLivingAdapter,
  WLSessionData,
  MomenceAdapter,
  createMomenceAdapter,
} from './adapters';

/**
 * Optional Integration Services (ManyChat, SchedulingKit)
 * These are utility services, not booking adapters
 */
export { ManyChatService, manychatService } from './manychat';
export { SchedulingKitService, schedulingKitService } from './schedulingkit';

/**
 * Booking Router - High-level routing layer for DEMO/LIVE mode switching
 * Routes booking operations based on MODE environment variable
 */
export { BookingRouter, BookingMode, bookingRouter, getBookingRouter } from './bookingRouter';
