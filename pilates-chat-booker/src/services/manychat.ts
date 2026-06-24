import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface ManyChatiResponse {
  status: string;
  data?: unknown;
}

export class ManyChatService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.manychat.com',
      headers: {
        'Authorization': `Bearer ${config.manychat.api_key}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(userId: string, message: string): Promise<ManyChatiResponse> {
    try {
      const response = await this.client.post('/v1/message/send', {
        subscriber_id: userId,
        text: message,
      });
      return response.data;
    } catch (error) {
      throw new Error(`ManyChat API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSubscriber(userId: string): Promise<ManyChatiResponse> {
    try {
      const response = await this.client.get(`/v1/subscriber/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subscriber: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', config.manychat.webhook_secret)
      .update(body)
      .digest('hex');
    return hash === signature;
  }
}

export const manychatService = new ManyChatService();
