import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  IBookingAdapter,
  AvailabilityResponse,
  BookingResponseData,
  ClientInfo,
} from '../IBookingAdapter';

const WELLNESS_LIVING_API_BASE_URL = 'https://kb.wellnessliving.com';
const SESSION_EXPIRY_MINUTES = 30;

export interface WLSessionData {
  sessionToken?: string;
  userId?: string;
  authenticated: boolean;
  authenticatedAt?: string;
  expiresAt?: string;
}

/**
 * WellnessLiving Booking Adapter
 *
 * Connects to WellnessLiving (also known as Zen Planner) API.
 * Uses session-based authentication with automatic session refresh.
 *
 * Requires: WL_USERNAME and WL_PASSWORD environment variables
 */
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
      },
      withCredentials: true,
    });

    logger.info('WellnessLivingAdapter initialized (unauthenticated)');
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

      logger.info(`Checking WellnessLiving availability for ${classType} on ${date}`);

      const sessionReady = await this.ensureSession();
      if (!sessionReady) {
        logger.error('Failed to establish WellnessLiving session for availability check');
        return {
          success: false,
          classId: classType,
          maxCapacity: 0,
          currentEnrollment: 0,
          availableSpots: 0,
          waitlistAvailable: false,
          error: 'Session authentication failed',
        };
      }

      const response = await this.client.get('/API/class/availability', {
        params: {
          classId: classType,
          date,
        },
        headers: {
          'X-Wellness-Session': this.session.sessionToken || '',
        },
      });

      const classData = this.parseClassData(response.data);

      logger.info(`Availability retrieved for ${classType}: ${classData.availableSpots} spots`);

      return {
        success: true,
        classId: classType,
        ...classData,
      };
    } catch (error) {
      logger.error(`WellnessLiving availability check failed for ${classType}:`, error as Error);

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

      logger.info(`Booking WellnessLiving slot ${slotId} for ${email}`);

      const sessionReady = await this.ensureSession();
      if (!sessionReady) {
        logger.error('Failed to establish WellnessLiving session for booking');
        return {
          success: false,
          classId: slotId,
          error: 'Session authentication failed',
        };
      }

      const nameParts = (clientInfo.customerName || 'Guest').split(/\s+/);
      const firstName = clientInfo.firstName || nameParts[0] || 'Guest';
      const lastName = clientInfo.lastName || nameParts.slice(1).join(' ') || '';

      const payload = {
        classId: slotId,
        client: {
          firstName,
          lastName,
          email,
          phone: clientInfo.phoneNumber || clientInfo.customerPhone || '',
        },
      };

      const response = await this.client.post('/API/class/booking/create', payload, {
        headers: {
          'X-Wellness-Session': this.session.sessionToken || '',
        },
      });

      const bookingData = this.parseBookingData(response.data, slotId);

      logger.info(`Booking confirmed on WellnessLiving: ${bookingData.bookingId}`);

      return {
        success: true,
        classId: slotId,
        ...bookingData,
      };
    } catch (error) {
      logger.error(`WellnessLiving booking failed for ${slotId}:`, error as Error);

      return {
        success: false,
        classId: slotId,
        error: error instanceof Error ? error.message : 'Booking failed',
      };
    }
  }

  /**
   * Create or refresh authentication session
   */
  async createSession(): Promise<boolean> {
    try {
      logger.info('Creating WellnessLiving session');

      const response = await this.client.post('/API/auth/login', {
        login: this.username,
        password: this.password,
      });

      const responseData = response.data as Record<string, unknown>;
      const sessionToken = String(responseData.sid || responseData.sessionId || responseData.token || '');

      if (!sessionToken) {
        logger.error('WellnessLiving login response missing session token');
        this.session = { authenticated: false };
        return false;
      }

      this.session.sessionToken = sessionToken;
      this.session.userId = String(responseData.userId || responseData.id || '');
      this.session.authenticated = true;
      this.session.authenticatedAt = new Date().toISOString();

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_EXPIRY_MINUTES);
      this.session.expiresAt = expiresAt.toISOString();

      logger.info('WellnessLiving session created successfully');
      return true;
    } catch (error) {
      logger.error('WellnessLiving session creation failed:', error as Error);
      this.session = { authenticated: false };
      return false;
    }
  }

  /**
   * Ensure session is valid, creating new if expired
   */
  async ensureSession(): Promise<boolean> {
    // TODO: Check if session exists and is not expired
    // If expired or missing, call createSession()

    if (this.session.authenticated && this.session.expiresAt) {
      const expiryTime = new Date(this.session.expiresAt).getTime();
      if (expiryTime > Date.now()) {
        return true;
      }
    }

    logger.info('Session missing or expired, creating new session');
    return await this.createSession();
  }

  /**
   * Get session info (with token redacted for security)
   */
  getSessionInfo(): Omit<WLSessionData, 'sessionToken'> & { sessionToken?: string } {
    return {
      ...this.session,
      sessionToken: this.session.sessionToken ? '***REDACTED***' : undefined,
    };
  }

  /**
   * Clear session
   */
  clearSession(): void {
    logger.info('Clearing WellnessLiving session');
    this.session = { authenticated: false };
  }

  /**
   * Parse WellnessLiving class availability response
   *
   * WellnessLiving API returns class data with various field name conventions
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
      logger.warn('Invalid WellnessLiving response data for class availability');
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
    if (classes.length === 0 && Array.isArray(data.data) && typeof data.data[0] === 'object') {
      classes = data.data;
    }

    if (classes.length === 0) {
      logger.warn('No classes found in WellnessLiving response');
      return {
        maxCapacity: 0,
        currentEnrollment: 0,
        availableSpots: 0,
        waitlistAvailable: false,
        waitlistCount: 0,
      };
    }

    const classInfo = classes[0] as Record<string, unknown>;
    const maxCapacity = Number(classInfo.classlimit) || Number(classInfo.maxCapacity) || Number(classInfo.class_limit) || 0;
    const enrolled = Number(classInfo.enrolled) || Number(classInfo.currentEnrollment) || Number(classInfo.count) || 0;
    const waitlist = Number(classInfo.waitlist) || Number(classInfo.waitlistCount) || Number(classInfo.waitlist_count) || 0;

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
   * Parse WellnessLiving booking response
   *
   * WellnessLiving API returns booking data with various field name conventions
   */
  private parseBookingData(
    responseData: unknown,
    classId: string,
  ): {
    bookingId: string;
    confirmationNumber?: string;
  } {
    if (!responseData || typeof responseData !== 'object') {
      logger.warn('Invalid WellnessLiving response data for booking');
      return {
        bookingId: `WL-${Date.now()}`,
        confirmationNumber: `WL-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };
    }

    const data = responseData as Record<string, unknown>;
    const bookingId = String(data.id || data.bookingId || data.appointmentId || `WL-${Date.now()}`);
    const confirmationNumber = String(data.confirmationCode || data.code || data.confirmationNumber || `WL-${Math.random().toString(36).substring(7).toUpperCase()}`);

    return {
      bookingId,
      confirmationNumber,
    };
  }
}

export const createWellnessLivingAdapter = (
  username: string,
  password: string,
): WellnessLivingAdapter => {
  return new WellnessLivingAdapter(username, password);
};
