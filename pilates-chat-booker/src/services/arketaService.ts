import { logger } from '../utils/logger';

export interface ArketaClass {
  id: string;
  name: string;
  instructorName: string;
  startTime: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  currentEnrollment: number;
  waitlistCount: number;
  availableSpots: number;
  classStatus: 'active' | 'cancelled' | 'full';
  bookingUrl?: string;
}

export interface ArketaWebhookPayload {
  eventType: string;
  timestamp: string;
  data: {
    classId: string;
    className: string;
    instructorName: string;
    scheduleStart: string;
    scheduleEnd: string;
    studio: string;
    maxCapacity: number;
    currentBookings: number;
    waitlistLimit: number;
    waitlistCount: number;
    status: 'active' | 'cancelled' | 'full';
    bookingLink?: string;
    [key: string]: unknown;
  };
}

export interface ParsedSchedule {
  classes: ArketaClass[];
  processedAt: string;
  totalClasses: number;
  errors?: ParseError[];
}

export interface ParseError {
  classId: string;
  field: string;
  reason: string;
}

export class ArketaService {
  private readonly validEventTypes = ['class.scheduled', 'class.updated', 'class.cancelled'];

  validateWebhookPayload(payload: unknown): payload is ArketaWebhookPayload {
    if (typeof payload !== 'object' || payload === null) {
      logger.error('Arketa webhook validation failed: payload is not an object');
      return false;
    }

    const typed = payload as Record<string, unknown>;

    if (!typed.eventType || typeof typed.eventType !== 'string') {
      logger.error('Arketa webhook validation failed: missing or invalid eventType');
      return false;
    }

    if (!this.validEventTypes.includes(typed.eventType)) {
      logger.warn(`Arketa webhook received unhandled event type: ${typed.eventType}`);
      return false;
    }

    if (!typed.timestamp || typeof typed.timestamp !== 'string') {
      logger.error('Arketa webhook validation failed: missing or invalid timestamp');
      return false;
    }

    if (!typed.data || typeof typed.data !== 'object') {
      logger.error('Arketa webhook validation failed: missing or invalid data object');
      return false;
    }

    const data = typed.data as Record<string, unknown>;

    const requiredFields = ['classId', 'className', 'scheduleStart', 'scheduleEnd', 'maxCapacity'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        logger.error(`Arketa webhook validation failed: missing required field '${field}'`);
        return false;
      }
    }

    return true;
  }

  parseArketaSchedule(payload: ArketaWebhookPayload): ParsedSchedule {
    const errors: ParseError[] = [];
    const classes: ArketaClass[] = [];

    try {
      logger.info(`Parsing Arketa schedule from event: ${payload.eventType}`);

      const parsedClass = this.parseClassData(payload.data, errors);

      if (parsedClass) {
        classes.push(parsedClass);
      }

      const result: ParsedSchedule = {
        classes,
        processedAt: new Date().toISOString(),
        totalClasses: classes.length,
      };

      if (errors.length > 0) {
        result.errors = errors;
        logger.warn(`Arketa schedule parsing completed with ${errors.length} error(s)`);
      } else {
        logger.info('Arketa schedule parsing completed successfully');
      }

      return result;
    } catch (error) {
      logger.error('Unexpected error parsing Arketa schedule:', error as Error);
      return {
        classes: [],
        processedAt: new Date().toISOString(),
        totalClasses: 0,
        errors: [
          {
            classId: 'unknown',
            field: 'payload',
            reason: error instanceof Error ? error.message : 'Unknown parsing error',
          },
        ],
      };
    }
  }

  parseMultipleClasses(payloads: ArketaWebhookPayload[]): ParsedSchedule {
    const allClasses: ArketaClass[] = [];
    const allErrors: ParseError[] = [];

    logger.info(`Parsing ${payloads.length} Arketa class payloads`);

    for (const payload of payloads) {
      try {
        if (!this.validateWebhookPayload(payload)) {
          logger.warn(`Invalid webhook payload skipped during batch processing`);
          continue;
        }

        const result = this.parseArketaSchedule(payload);
        allClasses.push(...result.classes);

        if (result.errors) {
          allErrors.push(...result.errors);
        }
      } catch (error) {
        logger.error('Error processing individual class payload:', error as Error);
        allErrors.push({
          classId: 'batch-error',
          field: 'payload',
          reason: error instanceof Error ? error.message : 'Batch processing error',
        });
      }
    }

    logger.info(
      `Batch parsing complete: ${allClasses.length} classes, ${allErrors.length} error(s)`,
    );

    return {
      classes: allClasses,
      processedAt: new Date().toISOString(),
      totalClasses: allClasses.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  private parseClassData(
    data: Record<string, unknown>,
    errors: ParseError[],
  ): ArketaClass | null {
    const classId = this.extractString(data.classId, 'classId', errors);
    if (!classId) {
      return null;
    }

    const className = this.extractString(data.className, 'className', errors, 'Unnamed Class');
    const instructorName = this.extractString(data.instructorName, 'instructorName', errors, 'TBD');
    const startTime = this.extractString(data.scheduleStart, 'scheduleStart', errors);
    const endTime = this.extractString(data.scheduleEnd, 'scheduleEnd', errors);
    const location = this.extractString(data.studio, 'studio', errors, 'Main Studio');

    const maxCapacity = this.extractNumber(data.maxCapacity, 'maxCapacity', errors);
    const currentEnrollment = this.extractNumber(data.currentBookings, 'currentBookings', errors, 0);
    const waitlistLimit = this.extractNumber(data.waitlistLimit, 'waitlistLimit', errors, 0);
    const waitlistCount = this.extractNumber(data.waitlistCount, 'waitlistCount', errors, 0);

    const status = this.extractStatus(data.status, 'status', errors);
    const bookingUrl = this.extractString(data.bookingLink, 'bookingLink', errors);

    const availableSpots = Math.max(0, maxCapacity - currentEnrollment);
    const isFull = availableSpots === 0;

    const classStatus: 'active' | 'cancelled' | 'full' = status === 'cancelled' ? 'cancelled' : isFull ? 'full' : 'active';

    return {
      id: classId,
      name: className,
      instructorName,
      startTime,
      endTime,
      location,
      maxCapacity,
      currentEnrollment,
      waitlistCount,
      availableSpots,
      classStatus,
      bookingUrl,
    };
  }

  private extractString(
    value: unknown,
    fieldName: string,
    errors: ParseError[],
    fallback?: string,
  ): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (fallback !== undefined) {
      return fallback;
    }

    logger.warn(`Missing or invalid string field: ${fieldName}`);
    errors.push({
      classId: 'unknown',
      field: fieldName,
      reason: `Invalid or missing string value: ${JSON.stringify(value)}`,
    });

    return '';
  }

  private extractNumber(
    value: unknown,
    fieldName: string,
    errors: ParseError[],
    fallback?: number,
  ): number {
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

    logger.warn(`Missing or invalid numeric field: ${fieldName}`);
    errors.push({
      classId: 'unknown',
      field: fieldName,
      reason: `Invalid or missing numeric value: ${JSON.stringify(value)}`,
    });

    return 0;
  }

  private extractStatus(
    value: unknown,
    fieldName: string,
    errors: ParseError[],
  ): 'active' | 'cancelled' | 'full' {
    const validStatuses: Array<'active' | 'cancelled' | 'full'> = ['active', 'cancelled', 'full'];

    if (typeof value === 'string' && validStatuses.includes(value as 'active' | 'cancelled' | 'full')) {
      return value as 'active' | 'cancelled' | 'full';
    }

    logger.warn(`Invalid class status value: ${JSON.stringify(value)}, defaulting to 'active'`);
    errors.push({
      classId: 'unknown',
      field: fieldName,
      reason: `Invalid status value: ${JSON.stringify(value)}`,
    });

    return 'active';
  }

  calculateAvailability(classes: ArketaClass[]): {
    totalClasses: number;
    activeClasses: number;
    cancelledClasses: number;
    fullClasses: number;
    totalSpots: number;
    availableSpots: number;
    waitlistCount: number;
  } {
    return {
      totalClasses: classes.length,
      activeClasses: classes.filter((c) => c.classStatus === 'active').length,
      cancelledClasses: classes.filter((c) => c.classStatus === 'cancelled').length,
      fullClasses: classes.filter((c) => c.classStatus === 'full').length,
      totalSpots: classes.reduce((sum, c) => sum + c.maxCapacity, 0),
      availableSpots: classes.reduce((sum, c) => sum + c.availableSpots, 0),
      waitlistCount: classes.reduce((sum, c) => sum + c.waitlistCount, 0),
    };
  }
}

export const arketaService = new ArketaService();
