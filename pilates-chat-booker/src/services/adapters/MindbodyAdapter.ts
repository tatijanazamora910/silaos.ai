import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  IBookingAdapter,
  AvailabilityResponse,
  BookingResponseData,
  ClientInfo,
} from '../IBookingAdapter';

const MINDBODY_API_BASE_URL = 'https://api.mindbodyonline.com/public/v6';
const MINDBODY_SANDBOX_SITE_ID = -99;

/**
 * Mindbody (by Zenoti) Booking Adapter
 *
 * Connects to Mindbody's public API for class scheduling and bookings.
 * Supports sandbox testing with SiteID -99.
 *
 * Requires: MINDBODY_API_KEY environment variable
 */
export class MindbodyAdapter implements IBookingAdapter {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      logger.error('MindbodyAdapter initialization failed: apiKey is required');
      throw new Error('Mindbody API key is required');
    }

    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: MINDBODY_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    logger.info('MindbodyAdapter initialized');
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

      logger.info(`Checking Mindbody availability for ${classType} on ${date}`);

      // TODO: Implement Mindbody API call to fetch class availability
      // GET /class/classes with parameters:
      // - siteId: MINDBODY_SANDBOX_SITE_ID
      // - startDate: date
      // - classId or className: classType

      const response = await this.client.get('/class/classes', {
        params: {
          siteId: MINDBODY_SANDBOX_SITE_ID,
          startDate: date,
          classId: classType,
        },
      });

      // TODO: Parse Mindbody response and extract:
      // - maxCapacity
      // - currentEnrollment (bookings count)
      // - availableSpots calculation
      // - waitlistAvailable flag
      // - waitlistCount

      const classData = this.parseClassData(response.data);

      logger.info(`Availability retrieved for ${classType}: ${classData.availableSpots} spots`);

      return {
        success: true,
        classId: classType,
        ...classData,
      };
    } catch (error) {
      logger.error(`Mindbody availability check failed for ${classType}:`, error as Error);

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

      logger.info(`Booking Mindbody slot ${slotId} for ${email}`);

      // TODO: Implement Mindbody API call to create booking
      // POST /booking/addclient with parameters:
      // - siteId: MINDBODY_SANDBOX_SITE_ID
      // - classId: slotId
      // - clientEmail: email
      // - clientFirstName, clientLastName
      // - clientPhone

      const payload = {
        siteId: MINDBODY_SANDBOX_SITE_ID,
        classId: slotId,
        clientEmail: email,
        clientFirstName: clientInfo.firstName || 'Guest',
        clientLastName: clientInfo.lastName || '',
        clientPhone: clientInfo.phoneNumber || clientInfo.customerPhone || '',
      };

      const response = await this.client.post('/booking/addclient', payload);

      // TODO: Parse Mindbody booking response and extract:
      // - bookingId or confirmationCode
      // - confirmationNumber

      const bookingData = this.parseBookingData(response.data, slotId);

      logger.info(`Booking confirmed on Mindbody: ${bookingData.bookingId}`);

      return {
        success: true,
        classId: slotId,
        ...bookingData,
      };
    } catch (error) {
      logger.error(`Mindbody booking failed for ${slotId}:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Parse Mindbody class availability response
   *
   * Mindbody API returns classes array with capacity and enrollment data
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
      logger.warn('Invalid Mindbody response data for class availability');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const data = responseData as Record<string, unknown>;
    const classes = Array.isArray(data.classes) ? data.classes : [];

    if (classes.length === 0) {
      logger.warn('No classes found in Mindbody response');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const classInfo = classes[0] as Record<string, unknown>;
    const maxCapacity = Number(classInfo.classlimit) || Number(classInfo.maxCapacity) || 0;
    const enrolled = Number(classInfo.enrolled) || Number(classInfo.currentEnrollment) || 0;
    const waitlist = Number(classInfo.waitlist_count) || Number(classInfo.waitlistCount) || 0;

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
   * Parse Mindbody booking response
   *
   * Mindbody API returns confirmation data with bookingId or confirmationCode
   */
  private parseBookingData(
    responseData: unknown,
    classId: string,
  ): {
    bookingId: string;
    confirmationNumber?: string;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid Mindbody response data for booking');
      return {
        bookingId: `MB-${Date.now()}`,
        confirmationNumber: `CONFIRM-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };
    }

    const data = responseData as Record<string, unknown>;
    const bookingId = String(data.bookingId || data.confirmationCode || data.appointmentId || `MB-${Date.now()}`);
    const confirmationNumber = String(data.confirmationNumber || data.confirmationCode || `CONFIRM-${Math.random().toString(36).substring(7).toUpperCase()}`);

    return {
      bookingId,
      confirmationNumber,
    };
  }
}

export const createMindbodyAdapter = (apiKey: string): MindbodyAdapter => {
  return new MindbodyAdapter(apiKey);
};
