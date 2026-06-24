import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import {
  IBookingAdapter,
  AvailabilityRequest,
  AvailabilityResponse,
  ClientInfo,
  BookingResponseData,
} from './IBookingAdapter';

export interface AvailabilityCheckRequest extends AvailabilityRequest {
  classId: string;
  startDate?: string;
  endDate?: string;
}

export interface AvailabilityCheckResponse extends AvailabilityResponse {
  classId: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount?: number;
  nextAvailableSlot?: string;
}

export interface BookingRequest extends ClientInfo {
  classId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}

export interface BookingResponse extends BookingResponseData {
  classId: string;
}

const MOMENCE_API_BASE_URL = 'https://api.momence.com/v1';

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

    logger.info('MomenceAdapter initialized successfully');
  }

  async checkAvailability(request: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> {
    const { classId, startDate, endDate } = request;

    if (!classId || classId.trim().length === 0) {
      logger.warn('checkAvailability called with missing classId');
      return {
        success: false,
        classId: classId || 'unknown',
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: 'Class ID is required',
      };
    }

    try {
      logger.info(`Checking availability for Momence class: ${classId}`);

      const params: Record<string, unknown> = {
        classId,
      };

      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const response = await this.client.get('/classes', {
        params,
      });

      const classData = this.extractClassData(response.data);

      const availableSpots = Math.max(0, classData.maxCapacity - classData.currentEnrollment);

      logger.info(
        `Availability check completed for ${classId}: ${availableSpots} spots available`,
      );

      return {
        success: true,
        classId,
        maxCapacity: classData.maxCapacity,
        currentEnrollment: classData.currentEnrollment,
        availableSpots,
        waitlistAvailable: classData.waitlistAvailable,
        waitlistCount: classData.waitlistCount,
        nextAvailableSlot: classData.nextAvailableSlot,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      logger.error(`Availability check failed for class ${classId}:`, error as Error);

      return {
        success: false,
        classId,
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: errorMessage,
      };
    }
  }

  async bookSlot(request: BookingRequest): Promise<BookingResponse> {
    const { classId, customerName, customerEmail, customerPhone, notes } = request;

    if (!classId || classId.trim().length === 0) {
      logger.warn('bookSlot called with missing classId');
      return {
        success: false,
        classId: classId || 'unknown',
        error: 'Class ID is required',
      };
    }

    if (!customerName || customerName.trim().length === 0) {
      logger.warn(`bookSlot called with missing customer name for class ${classId}`);
      return {
        success: false,
        classId,
        error: 'Customer name is required',
      };
    }

    if (!customerEmail || !this.isValidEmail(customerEmail)) {
      logger.warn(`bookSlot called with invalid email for class ${classId}`);
      return {
        success: false,
        classId,
        error: 'Valid customer email is required',
      };
    }

    try {
      logger.info(`Attempting to book slot for class ${classId} - customer: ${customerName}`);

      const payload = {
        classId,
        customer: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
        },
        notes: notes?.trim() || '',
      };

      const response = await this.client.post('/bookings', payload);

      const bookingData = this.extractBookingData(response.data);

      logger.info(
        `Booking successful for class ${classId}: booking ID ${bookingData.bookingId}`,
      );

      return {
        success: true,
        classId,
        bookingId: bookingData.bookingId,
        confirmationNumber: bookingData.confirmationNumber,
        bookingUrl: bookingData.bookingUrl,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      logger.error(
        `Booking failed for class ${classId} - customer ${customerName}:`,
        error as Error,
      );

      return {
        success: false,
        classId,
        error: errorMessage,
      };
    }
  }

  private extractClassData(
    responseData: unknown,
  ): {
    maxCapacity: number;
    currentEnrollment: number;
    waitlistAvailable: boolean;
    waitlistCount?: number;
    nextAvailableSlot?: string;
  } {
    if (typeof responseData !== 'object' || responseData === null) {
      logger.warn('Invalid class data response structure');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        waitlistAvailable: false,
      };
    }

    const data = responseData as Record<string, unknown>;

    const maxCapacity = this.safeExtractNumber(data.maxCapacity, 'maxCapacity', 0);
    const currentEnrollment = this.safeExtractNumber(
      data.currentEnrollment || data.bookings,
      'currentEnrollment',
      0,
    );
    const waitlistAvailable = this.safeExtractBoolean(data.waitlistAvailable, false);
    const waitlistCount = this.safeExtractNumber(data.waitlistCount, 'waitlistCount');
    const nextAvailableSlot = this.safeExtractString(data.nextAvailableSlot, '');

    return {
      maxCapacity,
      currentEnrollment,
      waitlistAvailable,
      waitlistCount,
      nextAvailableSlot: nextAvailableSlot || undefined,
    };
  }

  private extractBookingData(
    responseData: unknown,
  ): {
    bookingId: string;
    confirmationNumber?: string;
    bookingUrl?: string;
  } {
    if (typeof responseData !== 'object' || responseData === null) {
      logger.warn('Invalid booking response structure');
      return {
        bookingId: '',
      };
    }

    const data = responseData as Record<string, unknown>;

    const bookingId = this.safeExtractString(data.bookingId || data.id, '');
    const confirmationNumber = this.safeExtractString(data.confirmationNumber, '');
    const bookingUrl = this.safeExtractString(data.bookingUrl || data.confirmationUrl, '');

    if (!bookingId) {
      logger.warn('Booking response missing required bookingId field');
    }

    return {
      bookingId,
      confirmationNumber: confirmationNumber || undefined,
      bookingUrl: bookingUrl || undefined,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof axios.AxiosError) {
      if (error.response?.status === 400) {
        const errorData = error.response.data as Record<string, unknown>;
        return errorData.message || 'Invalid request parameters';
      }
      if (error.response?.status === 401) {
        return 'Unauthorized: Invalid or expired Momence API key';
      }
      if (error.response?.status === 403) {
        return 'Forbidden: Access denied to this resource';
      }
      if (error.response?.status === 404) {
        return 'Not found: Class or resource does not exist';
      }
      if (error.response?.status === 409) {
        return 'Conflict: Class is full or slot no longer available';
      }
      if (error.response?.status === 429) {
        return 'Rate limited: Too many requests to Momence API';
      }
      if (error.response?.status === 503) {
        return 'Momence service temporarily unavailable';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout: Momence API took too long to respond';
      }
      if (error.code === 'ECONNREFUSED') {
        return 'Connection refused: Unable to reach Momence API';
      }
      return error.response?.data?.message || error.message || 'Unknown API error';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  private safeExtractNumber(value: unknown, fieldName: string, fallback?: number): number {
    if (typeof value === 'number' && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    if (fallback !== undefined) {
      return fallback;
    }

    logger.debug(`Field '${fieldName}' could not be extracted as number from: ${JSON.stringify(value)}`);
    return 0;
  }

  private safeExtractString(value: unknown, fallback: string = ''): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    return fallback;
  }

  private safeExtractBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return fallback;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const createMomenceAdapter = (apiKey: string, businessId: string): MomenceAdapter => {
  return new MomenceAdapter(apiKey, businessId);
};
