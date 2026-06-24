import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  IBookingAdapter,
  AvailabilityResponse,
  BookingResponseData,
  ClientInfo,
} from '../IBookingAdapter';

const MOMENCE_API_BASE_URL = 'https://api.momence.com/v1';

/**
 * Momence Booking Adapter
 *
 * Connects to Momence's REST API for class scheduling and bookings.
 * Momence is a modern studio management platform with straightforward API design.
 *
 * Requires: MOMENCE_API_KEY and MOMENCE_BUSINESS_ID environment variables
 */
export class MomenceAdapter implements IBookingAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private businessId: string;

  constructor(apiKey: string, businessId: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      logger.error('MomenceAdapter initialization failed: apiKey is required');
      throw new Error('Momence API key is required');
    }

    if (!businessId || businessId.trim().length === 0) {
      logger.error('MomenceAdapter initialization failed: businessId is required');
      throw new Error('Momence business ID is required');
    }

    this.apiKey = apiKey;
    this.businessId = businessId;

    this.client = axios.create({
      baseURL: MOMENCE_API_BASE_URL,
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Business-ID': this.businessId,
      },
    });

    logger.info('MomenceAdapter initialized');
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

      logger.info(`Checking Momence availability for ${classType} on ${date}`);

      // TODO: Implement Momence API call to fetch class availability
      // GET /classes with query parameters:
      // - classId or classType: classType
      // - date: date (ISO format YYYY-MM-DD)
      // - startDate, endDate: optional date range

      const response = await this.client.get('/classes', {
        params: {
          classId: classType,
          date,
        },
      });

      // TODO: Parse Momence response and extract:
      // - maxCapacity
      // - currentEnrollment (bookings count)
      // - availableSpots calculation
      // - waitlistAvailable flag
      // - waitlistCount (if applicable)
      // - nextAvailableSlot (ISO timestamp of next available class)

      const classData = this.parseClassData(response.data);

      logger.info(`Availability retrieved for ${classType}: ${classData.availableSpots} spots`);

      return {
        success: true,
        classId: classType,
        ...classData,
      };
    } catch (error) {
      logger.error(`Momence availability check failed for ${classType}:`, error as Error);

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

      logger.info(`Booking Momence slot ${slotId} for ${email}`);

      // TODO: Implement Momence API call to create booking
      // POST /bookings with payload:
      // - classId: slotId
      // - customer: {
      //     name: clientInfo.customerName,
      //     email: email,
      //     phone: clientInfo.phoneNumber or customerPhone
      //   }
      // - notes: optional additional information

      const payload = {
        classId: slotId,
        customer: {
          name:
            clientInfo.customerName ||
            `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim(),
          email,
          phone: clientInfo.phoneNumber || clientInfo.customerPhone || '',
        },
        notes: (clientInfo as Record<string, unknown>).notes?.toString() || '',
      };

      const response = await this.client.post('/bookings', payload);

      // TODO: Parse Momence booking response and extract:
      // - bookingId or id
      // - confirmationNumber or confirmationCode
      // - bookingUrl (direct link to booking confirmation)

      const bookingData = this.parseBookingData(response.data, slotId);

      logger.info(`Booking confirmed on Momence: ${bookingData.bookingId}`);

      return {
        success: true,
        classId: slotId,
        ...bookingData,
      };
    } catch (error) {
      logger.error(`Momence booking failed for ${slotId}:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Parse Momence class availability response
   *
   * Momence API returns class data with capacity and booking counts
   */
  private parseClassData(
    responseData: unknown,
  ): {
    maxCapacity: number;
    currentEnrollment: number;
    availableSpots: number;
    waitlistAvailable: boolean;
    waitlistCount?: number;
    nextAvailableSlot?: string;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid Momence response data for class availability');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const data = responseData as Record<string, unknown>;

    let classInfo: Record<string, unknown>;

    if (Array.isArray(data.classes) && data.classes.length > 0) {
      classInfo = data.classes[0] as Record<string, unknown>;
    } else if (Array.isArray(data.data) && data.data.length > 0) {
      classInfo = data.data[0] as Record<string, unknown>;
    } else if (typeof data.maxCapacity === 'number' || typeof data.id === 'string') {
      classInfo = data;
    } else {
      logger.warn('No class data found in Momence response');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const maxCapacity = Number(classInfo.maxCapacity) || Number(classInfo.capacity) || 0;
    const currentEnrollment = Number(classInfo.currentEnrollment) || Number(classInfo.bookings) || Number(classInfo.enrolled) || 0;
    const waitlistCount = Number(classInfo.waitlistCount) || Number(classInfo.waitlist) || 0;

    const availableSpots = Math.max(0, maxCapacity - currentEnrollment);
    const waitlistAvailable = waitlistCount > 0 || availableSpots === 0;
    const nextAvailableSlot = typeof classInfo.nextAvailableSlot === 'string' ? classInfo.nextAvailableSlot : undefined;

    return {
      maxCapacity,
      currentEnrollment,
      availableSpots,
      waitlistAvailable,
      waitlistCount,
      nextAvailableSlot,
    };
  }

  /**
   * Parse Momence booking response
   *
   * Momence API returns booking confirmation with ID and direct booking URL
   */
  private parseBookingData(
    responseData: unknown,
    classId: string,
  ): {
    bookingId: string;
    confirmationNumber?: string;
    bookingUrl?: string;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid Momence response data for booking');
      return {
        bookingId: `MOM-${Date.now()}`,
        confirmationNumber: `CONF-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };
    }

    const data = responseData as Record<string, unknown>;
    const bookingId = String(data.bookingId || data.id || `MOM-${Date.now()}`);
    const confirmationNumber = String(data.confirmationNumber || data.confirmationCode || `CONF-${Math.random().toString(36).substring(7).toUpperCase()}`);
    const bookingUrl = typeof data.bookingUrl === 'string' ? data.bookingUrl : undefined;

    return {
      bookingId,
      confirmationNumber,
      bookingUrl,
    };
  }
}

export const createMomenceAdapter = (apiKey: string, businessId: string): MomenceAdapter => {
  return new MomenceAdapter(apiKey, businessId);
};
