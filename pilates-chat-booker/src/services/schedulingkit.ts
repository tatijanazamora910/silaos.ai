import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface AvailableSlot {
  date: string;
  time: string;
  duration: number;
  available: boolean;
}

export interface BookingRequest {
  service_id: string;
  customer_name: string;
  customer_phone: string;
  slot_date: string;
  slot_time: string;
}

export interface BookingResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
}

export class SchedulingKitService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.schedulingkit.com',
      headers: {
        'Authorization': `Bearer ${config.schedulingkit.api_key}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getAvailableSlots(serviceId: string, dateRange: { start: string; end: string }): Promise<AvailableSlot[]> {
    try {
      const response = await this.client.get(`/v1/availability/${serviceId}`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
      });
      return response.data.slots || [];
    } catch (error) {
      throw new Error(`Failed to fetch availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await this.client.post('/v1/bookings', {
        business_id: config.schedulingkit.business_id,
        ...booking,
      });
      return {
        success: response.data.success,
        booking_id: response.data.booking_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking',
      };
    }
  }

  async cancelBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await this.client.delete(`/v1/bookings/${bookingId}`);
      return {
        success: response.data.success,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel booking',
      };
    }
  }
}

export const schedulingKitService = new SchedulingKitService();
