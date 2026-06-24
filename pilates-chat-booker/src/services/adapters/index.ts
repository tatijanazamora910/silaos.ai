/**
 * Booking Platform Adapters
 *
 * This directory contains adapter implementations for various studio management platforms.
 * Each adapter implements the standard IBookingAdapter interface, providing a unified
 * interface for availability checks and bookings across different platforms.
 *
 * Adapters:
 * - MindbodyAdapter: Mindbody by Zenoti (public API)
 * - ArketaAdapter: Arketa (event-based scheduling)
 * - WellnessLivingAdapter: WellnessLiving / Zen Planner (session-based)
 * - MomenceAdapter: Momence (REST API)
 */

export { MindbodyAdapter, createMindbodyAdapter } from './MindbodyAdapter';
export { ArketaAdapter, createArketaAdapter } from './ArketaAdapter';
export {
  WellnessLivingAdapter,
  createWellnessLivingAdapter,
  WLSessionData,
} from './WellnessLivingAdapter';
export { MomenceAdapter, createMomenceAdapter } from './MomenceAdapter';
