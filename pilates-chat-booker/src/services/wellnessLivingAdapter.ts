import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import {
  IBookingAdapter,
  AvailabilityRequest,
  AvailabilityResponse,
  ClientInfo,
  BookingResponseData,
} from './IBookingAdapter';

export interface WLSessionData {
  sessionToken?: string;
  userId?: string;
  cookies?: string[];
  authenticated: boolean;
  authenticatedAt?: string;
  expiresAt?: string;
}

export interface WLClassInfo {
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount: number;
}

export interface WLClientInfo {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface WLBookingData {
  bookingId: string;
  classId: string;
  clientId: string;
  confirmationCode: string;
  bookingDate: string;
  classStartTime: string;
}

const WELLNESS_LIVING_API_BASE_URL = 'https://kb.wellnessliving.com';
const SESSION_EXPIRY_MINUTES = 30;

export class WellnessLivingAdapter implements IBookingAdapter {
  private client: AxiosInstance;
  private session: WLSessionData;
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    if (!username || username.trim().length === 0) {
      logger.error('WellnessLivingAdapter initialization failed: username is required');
      throw new Error('WellnessLiving username is required');
    }

    if (!password || password.trim().length === 0) {
      logger.error('WellnessLivingAdapter initialization failed: password is required');
      throw new Error('WellnessLiving password is required');
    }

    this.username = username;
    this.password = password;

    this.session = {
      authenticated: false,
    };

    this.client = axios.create({
      baseURL: WELLNESS_LIVING_API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PilatesChatBooker/1.0',
      },
      withCredentials: true,
    });

    logger.info('WellnessLivingAdapter initialized (unauthenticated)');
  }

  private isSessionExpired(): boolean {
    if (!this.session.expiresAt) {
      return true;
    }

    const expiryTime = new Date(this.session.expiresAt).getTime();
    const currentTime = Date.now();

    return currentTime > expiryTime;
  }

  private setSessionExpiry(): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_EXPIRY_MINUTES);
    this.session.expiresAt = expiresAt.toISOString();
  }

  async createSession(): Promise<boolean> {
    try {
      logger.info('Creating WellnessLiving session');

      const response = await this.client.post('/API/auth/login', {
        login: this.username,
        password: this.password,
      });

      const sessionData = response.data as Record<string, unknown>;

      if (!sessionData.sid && !sessionData.sessionId) {
        logger.error('WellnessLiving authentication response missing session identifier');
        return false;
      }

      const sessionToken = this.safeExtractString(
        sessionData.sid || sessionData.sessionId,
        '',
      );
      const userId = this.safeExtractString(sessionData.uid || sessionData.userId, '');

      this.session = {
        sessionToken,
        userId,
        authenticated: true,
        authenticatedAt: new Date().toISOString(),
      };

      this.setSessionExpiry();

      this.client.defaults.headers.common['X-Wellness-Session'] = sessionToken;

      if (response.headers['set-cookie']) {
        this.session.cookies = Array.isArray(response.headers['set-cookie'])
          ? response.headers['set-cookie']
          : [String(response.headers['set-cookie'])];
      }

      logger.info(`WellnessLiving session created successfully for user ${userId}`);
      return true;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      logger.error(`WellnessLiving session creation failed: ${errorMessage}`, error as Error);
      this.session = {
        authenticated: false,
      };
      return false;
    }
  }

  async ensureSession(): Promise<boolean> {
    if (this.session.authenticated && !this.isSessionExpired()) {
      return true;
    }

    logger.info('Session missing or expired, creating new session');
    return await this.createSession();
  }

  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    const classId = classType;
    const startDate = date;

    if (!classId || classId.trim().length === 0) {
      logger.warn('checkAvailability called with missing classType/classId');
      return {
        success: false,
        classId: classId || 'unknown',
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        error: 'Class ID/type is required',
      };
    }

    try {
      const hasSession = await this.ensureSession();
      if (!hasSession) {
        logger.error('Failed to establish WellnessLiving session for availability check');
        return {
          success: false,
          classId,
          maxCapacity: 0,
          currentEnrollment: 0,
          availableSpots: 0,
          waitlistAvailable: false,
          error: 'Authentication failed',
        };
      }

      logger.info(`Checking WellnessLiving availability for class: ${classId}`);

      const params: Record<string, unknown> = {
        classId,
      };

      if (startDate) {
        params.date = startDate;
      }

      const response = await this.client.get('/API/class/availability', {
        params,
      });

      const classData = this.extractClassData(response.data);

      logger.info(
        `Availability check completed for ${classId}: ${classData.availableSpots} spots available`,
      );

      return {
        success: true,
        classId,
        maxCapacity: classData.maxCapacity,
        currentEnrollment: classData.currentEnrollment,
        availableSpots: classData.availableSpots,
        waitlistAvailable: classData.waitlistAvailable,
        waitlistCount: classData.waitlistCount,
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

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    const classId = slotId;

    if (!slotId || slotId.trim().length === 0) {
      logger.warn('bookSlot called with missing slotId');
      return {
        success: false,
        classId: slotId || 'unknown',
        error: 'Slot ID is required',
      };
    }

    const email = clientInfo.email || clientInfo.customerEmail || '';
    if (!email || !this.isValidEmail(email)) {
      logger.warn(`bookSlot called with invalid email for slot ${slotId}`);
      return {
        success: false,
        classId,
        error: 'Valid customer email is required',
      };
    }

    const phoneNumber = clientInfo.phoneNumber || clientInfo.customerPhone || clientInfo.phone || '';
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      logger.warn(`bookSlot called with missing phone number for slot ${slotId}`);
      return {
        success: false,
        classId,
        error: 'Customer phone is required',
      };
    }

    try {
      const hasSession = await this.ensureSession();
      if (!hasSession) {
        logger.error('Failed to establish WellnessLiving session for booking');
        return {
          success: false,
          classId,
          error: 'Authentication failed',
        };
      }

      const customerName =
        clientInfo.customerName ||
        (clientInfo.firstName && clientInfo.lastName
          ? `${clientInfo.firstName} ${clientInfo.lastName}`
          : 'Guest');

      logger.info(
        `Attempting to book WellnessLiving slot ${slotId} - customer: ${customerName}`,
      );

      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        classId,
        client: {
          firstName,
          lastName,
          email: email.trim(),
          phone: phoneNumber.trim(),
        },
        notes: (clientInfo as Record<string, unknown>).notes?.toString().trim() || '',
      };

      const response = await this.client.post('/API/class/booking/create', payload);

      const bookingData = this.extractBookingData(response.data);

      if (!bookingData.bookingId) {
        logger.warn('Booking created but response missing bookingId');
        return {
          success: false,
          classId,
          error: 'Booking response incomplete',
        };
      }

      logger.info(
        `Booking successful for class ${classId}: booking ID ${bookingData.bookingId}`,
      );

      return {
        success: true,
        classId,
        bookingId: bookingData.bookingId,
        confirmationNumber: bookingData.confirmationCode,
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

  getSessionInfo(): WLSessionData {
    return {
      ...this.session,
      sessionToken: this.session.sessionToken ? '***REDACTED***' : undefined,
    };
  }

  clearSession(): void {
    logger.info('Clearing WellnessLiving session');
    this.session = {
      authenticated: false,
    };
    delete this.client.defaults.headers.common['X-Wellness-Session'];
  }

  private extractClassData(
    responseData: unknown,
  ): {
    maxCapacity: number;
    currentEnrollment: number;
    availableSpots: number;
    waitlistAvailable: boolean;
    waitlistCount: number;
  } {
    if (typeof responseData !== 'object' || responseData === null) {
      logger.warn('Invalid WellnessLiving class data response structure');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const data = responseData as Record<string, unknown>;

    const maxCapacity = this.safeExtractNumber(
      data.maxCapacity || data.classlimit,
      'maxCapacity',
      0,
    );
    const currentEnrollment = this.safeExtractNumber(
      data.currentEnrollment || data.enrolled,
      'currentEnrollment',
      0,
    );
    const waitlistAvailable = this.safeExtractBoolean(data.waitlistAvailable, false);
    const waitlistCount = this.safeExtractNumber(data.waitlistCount || data.waitlist, 'waitlistCount', 0);

    const availableSpots = Math.max(0, maxCapacity - currentEnrollment);

    return {
      maxCapacity,
      currentEnrollment,
      availableSpots,
      waitlistAvailable,
      waitlistCount,
    };
  }

  private extractBookingData(
    responseData: unknown,
  ): {
    bookingId: string;
    confirmationCode: string;
    classId: string;
    bookingDate: string;
    classStartTime: string;
  } {
    if (typeof responseData !== 'object' || responseData === null) {
      logger.warn('Invalid WellnessLiving booking response structure');
      return {
        bookingId: '',
        confirmationCode: '',
        classId: '',
        bookingDate: '',
        classStartTime: '',
      };
    }

    const data = responseData as Record<string, unknown>;

    const bookingId = this.safeExtractString(data.id || data.bookingId, '');
    const confirmationCode = this.safeExtractString(data.confirmationCode || data.code, '');
    const classId = this.safeExtractString(data.classId || data.class_id, '');
    const bookingDate = this.safeExtractString(data.bookingDate || data.dt_create, '');
    const classStartTime = this.safeExtractString(data.classStartTime || data.dt_start, '');

    if (!bookingId) {
      logger.warn('Booking response missing required bookingId field');
    }

    return {
      bookingId,
      confirmationCode,
      classId,
      bookingDate,
      classStartTime,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof axios.AxiosError) {
      if (error.response?.status === 400) {
        const errorData = error.response.data as Record<string, unknown>;
        return errorData.message || 'Invalid request parameters';
      }
      if (error.response?.status === 401) {
        return 'Unauthorized: Invalid WellnessLiving credentials';
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
        return 'Rate limited: Too many requests to WellnessLiving API';
      }
      if (error.response?.status === 503) {
        return 'WellnessLiving service temporarily unavailable';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout: WellnessLiving API took too long to respond';
      }
      if (error.code === 'ECONNREFUSED') {
        return 'Connection refused: Unable to reach WellnessLiving API';
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
      return value.toLowerCase() === 'true' || value === '1';
    }

    return fallback;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const createWellnessLivingAdapter = (username: string, password: string): WellnessLivingAdapter => {
  return new WellnessLivingAdapter(username, password);
};
