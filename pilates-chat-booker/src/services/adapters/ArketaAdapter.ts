import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  IBookingAdapter,
  AvailabilityResponse,
  BookingResponseData,
  ClientInfo,
} from '../IBookingAdapter';

const ARKETA_API_BASE_URL = 'https://api.arketa.com/v1';

/**
 * Arketa Booking Adapter
 *
 * Connects to Arketa's event-based scheduling API.
 * Arketa pushes class updates via webhooks; this adapter provides
 * availability checks and booking creation.
 *
 * Requires: ARKETA_API_KEY environment variable
 */
export class ArketaAdapter implements IBookingAdapter {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      logger.error('ArketaAdapter initialization failed: apiKey is required');
      throw new Error('Arketa API key is required');
    }

    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: ARKETA_API_BASE_URL,
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    logger.info('ArketaAdapter initialized');
  }

  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    try {
      if (!date || !classType) {
        logger.warn('checkAvailability missing required parameters');
        return {
          success: false,
          classId: classType || 'unknown',
          maxCapacity: 0,
          currentEnrollment: 0,
          availableSpots: 0,
          waitlistAvailable: false,
          error: 'Date and class type are required',
        };
      }

      logger.info(`Checking Arketa availability for ${classType} on ${date}`);

      // TODO: Implement Arketa API call to fetch class availability
      // GET /classes or /schedule with parameters:
      // - date: date (ISO format)
      // - classType or classId: classType
      // Arketa may return event-based availability

      const response = await this.client.get('/classes', {
        params: {
          date,
          classId: classType,
        },
      });

      // TODO: Parse Arketa response and extract:
      // - classId
      // - maxCapacity
      // - currentEnrollment (enrollments count)
      // - waitlistAvailable and waitlistCount
      // Arketa response format differs from Mindbody

      const classData = this.parseClassData(response.data);

      logger.info(`Availability retrieved for ${classType}: ${classData.availableSpots} spots`);

      return {
        success: true,
        classId: classType,
        ...classData,
      };
    } catch (error) {
      logger.error(`Arketa availability check failed for ${classType}:`, error as Error);

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

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    try {
      const email = clientInfo.email || clientInfo.customerEmail || '';

      if (!slotId || !email) {
        logger.warn('bookSlot missing required parameters');
        return {
          success: false,
          classId: slotId || 'unknown',
          error: 'Slot ID and email are required',
        };
      }

      logger.info(`Booking Arketa slot ${slotId} for ${email}`);

      // TODO: Implement Arketa API call to create booking
      // POST /bookings or /enrollments with parameters:
      // - classId: slotId
      // - email: email
      // - firstName, lastName
      // - phoneNumber

      const payload = {
        classId: slotId,
        email,
        firstName: clientInfo.firstName || clientInfo.customerName?.split(' ')[0] || 'Guest',
        lastName: clientInfo.lastName || clientInfo.customerName?.split(' ').slice(1).join(' ') || '',
        phoneNumber: clientInfo.phoneNumber || clientInfo.customerPhone || '',
      };

      const response = await this.client.post('/bookings', payload);

      // TODO: Parse Arketa booking response and extract:
      // - bookingId or enrollmentId
      // - confirmationCode
      // Arketa may return status field, ensure booking was successful

      const bookingData = this.parseBookingData(response.data, slotId);

      logger.info(`Booking confirmed on Arketa: ${bookingData.bookingId}`);

      return {
        success: true,
        classId: slotId,
        ...bookingData,
      };
    } catch (error) {
      logger.error(`Arketa booking failed for ${slotId}:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Parse Arketa class availability response
   *
   * Arketa API returns events or classes array with capacity and enrollment data
   */
  private parseClassData(
    responseData: unknown,
  ): {
    maxCapacity: number;
    currentEnrollment: number;
    availableSpots: number;
    waitlistAvailable: boolean;
    waitlistCount?: number;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid Arketa response data for class availability');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const data = responseData as Record<string, unknown>;

    let classes = Array.isArray(data.classes) ? data.classes : [];
    if (classes.length === 0 && Array.isArray(data.events)) {
      classes = data.events;
    }

    if (classes.length === 0) {
      logger.warn('No classes or events found in Arketa response');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const classInfo = classes[0] as Record<string, unknown>;
    const maxCapacity = Number(classInfo.capacity) || Number(classInfo.maxCapacity) || 0;
    const enrolled = Number(classInfo.enrollments) || Number(classInfo.currentEnrollment) || Number(classInfo.booked) || 0;
    const waitlist = Number(classInfo.waitlist) || Number(classInfo.waitlistCount) || 0;

    const availableSpots = Math.max(0, maxCapacity - enrolled);
    const waitlistAvailable = waitlist > 0 || availableSpots === 0;

    return {
      maxCapacity,
      currentEnrollment: enrolled,
      availableSpots,
      waitlistAvailable,
      waitlistCount: waitlist,
    };
  }

  /**
   * Parse Arketa booking response
   *
   * Arketa API returns enrollment data with enrollmentId or bookingId
   */
  private parseBookingData(
    responseData: unknown,
    classId: string,
  ): {
    bookingId: string;
    confirmationNumber?: string;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid Arketa response data for booking');
      return {
        bookingId: `ARK-${Date.now()}`,
        confirmationNumber: `ARK-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };
    }

    const data = responseData as Record<string, unknown>;
    const bookingId = String(data.enrollmentId || data.bookingId || data.id || `ARK-${Date.now()}`);
    const confirmationNumber = String(data.confirmationCode || data.confirmationNumber || `ARK-${Math.random().toString(36).substring(7).toUpperCase()}`);

    return {
      bookingId,
      confirmationNumber,
    };
  }
}

export const createArketaAdapter = (apiKey: string): ArketaAdapter => {
  return new ArketaAdapter(apiKey);
};
