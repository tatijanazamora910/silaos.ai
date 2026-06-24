import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface ClassSession {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  classDescription: string;
  maxCapacity: number;
  numBookings: number;
  location: string;
}

export interface MindbodyScheduleResponse {
  success: boolean;
  classes?: ClassSession[];
  error?: string;
}

const MINDBODY_SANDBOX_SITE_ID = -99;
const MINDBODY_API_BASE_URL = 'https://api.mindbodyonline.com/public/v6';

export class MindbodyService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = this.validateApiKey();
    this.client = axios.create({
      baseURL: MINDBODY_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  private validateApiKey(): string {
    const key = process.env.MINDBODY_API_KEY;
    if (!key) {
      throw new Error('Missing required environment variable: MINDBODY_API_KEY');
    }
    return key;
  }

  async checkSandboxSchedule(): Promise<MindbodyScheduleResponse> {
    try {
      const response = await this.client.get('/class/classes', {
        params: {
          siteId: MINDBODY_SANDBOX_SITE_ID,
        },
      });

      const classes = this.mapMindbodyClasses(response.data);

      return {
        success: true,
        classes,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getScheduleByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<MindbodyScheduleResponse> {
    try {
      const response = await this.client.get('/class/classes', {
        params: {
          siteId: MINDBODY_SANDBOX_SITE_ID,
          startDate,
          endDate,
        },
      });

      const classes = this.mapMindbodyClasses(response.data);

      return {
        success: true,
        classes,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getClassById(classId: string): Promise<MindbodyScheduleResponse> {
    try {
      const response = await this.client.get('/class/classes', {
        params: {
          siteId: MINDBODY_SANDBOX_SITE_ID,
          classId,
        },
      });

      const classes = this.mapMindbodyClasses(response.data);

      return {
        success: true,
        classes,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private mapMindbodyClasses(responseData: unknown): ClassSession[] {
    // Type guard: ensure responseData is an object with a classes array
    if (
      typeof responseData !== 'object' ||
      responseData === null ||
      !Array.isArray((responseData as Record<string, unknown>).classes)
    ) {
      return [];
    }

    const rawClasses = (responseData as Record<string, ClassSession[]>).classes;

    return rawClasses.map((cls) => ({
      id: cls.id || '',
      name: cls.name || 'Unnamed Class',
      startTime: cls.startTime || '',
      endTime: cls.endTime || '',
      classDescription: cls.classDescription || '',
      maxCapacity: cls.maxCapacity || 0,
      numBookings: cls.numBookings || 0,
      location: cls.location || 'Unknown Location',
    }));
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof axios.AxiosError) {
      if (error.response?.status === 401) {
        return 'Unauthorized: Invalid or expired API key';
      }
      if (error.response?.status === 403) {
        return 'Forbidden: Access denied to this resource';
      }
      if (error.response?.status === 404) {
        return 'Not found: Invalid SiteID or endpoint';
      }
      if (error.response?.status === 429) {
        return 'Rate limited: Too many requests to Mindbody API';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout: Mindbody API took too long to respond';
      }
      return error.response?.data?.message || error.message || 'Unknown API error';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}

export const mindbodyService = new MindbodyService();
