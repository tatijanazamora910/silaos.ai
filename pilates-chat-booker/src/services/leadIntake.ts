/**
 * Unified Lead Intake System
 *
 * Handles incoming booking requests from all channels:
 * - Chat (Facebook, WhatsApp, Instagram)
 * - Email
 * - SMS (Twilio)
 * - Web Forms
 * - Google Business Profile
 *
 * Converts all channels into standardized lead format,
 * extracts intent and client info, then routes to BookingRouter
 */

import { logger } from '../utils/logger';
import { ClientInfo } from './IBookingAdapter';

export enum LeadChannel {
  CHAT = 'chat',
  EMAIL = 'email',
  SMS = 'sms',
  WEB_FORM = 'web_form',
  GOOGLE = 'google',
}

export interface Lead {
  id: string;
  channel: LeadChannel;
  timestamp: string;
  clientInfo: ClientInfo;
  rawMessage: string;
  intent: 'availability' | 'booking' | 'help' | 'unknown';
  extractedDate?: string;
  extractedClassType?: string;
  confidence: number; // 0-1, how confident we are in the intent
  metadata: {
    sourceId?: string; // Email ID, Phone number, Form submission ID, etc.
    platformId?: string; // Which platform (Mindbody, Arketa, etc.)
    studioId?: string;
  };
}

export interface LeadResponse {
  success: boolean;
  leadId?: string;
  message: string;
  nextStep?: string; // What the system should do next
}

/**
 * Lead Intake Service
 * Unified handler for all incoming lead channels
 */
export class LeadIntakeService {
  private leads: Map<string, Lead> = new Map();

  /**
   * Process incoming lead from any channel
   */
  async processLead(
    channel: LeadChannel,
    clientInfo: ClientInfo,
    rawMessage: string,
    metadata?: any,
  ): Promise<LeadResponse> {
    try {
      const leadId = this.generateLeadId();
      const timestamp = new Date().toISOString();

      logger.info(`[${channel.toUpperCase()}] Processing new lead: ${leadId}`);

      // Extract intent from message
      const intent = this.detectIntent(rawMessage);
      const extractedDate = this.extractDate(rawMessage);
      const extractedClassType = this.extractClassType(rawMessage);
      const confidence = this.calculateConfidence(intent, rawMessage);

      // Create lead object
      const lead: Lead = {
        id: leadId,
        channel,
        timestamp,
        clientInfo,
        rawMessage,
        intent,
        extractedDate,
        extractedClassType,
        confidence,
        metadata: metadata || {},
      };

      // Store lead
      this.leads.set(leadId, lead);

      logger.info(
        `[${channel.toUpperCase()}] Lead created: ${leadId} | Intent: ${intent} | Confidence: ${Math.round(confidence * 100)}%`,
      );

      return {
        success: true,
        leadId,
        message: `Lead received from ${channel}`,
        nextStep: this.determineNextStep(lead),
      };
    } catch (error) {
      logger.error(`[LeadIntake] Error processing lead:`, error as Error);
      return {
        success: false,
        message: 'Failed to process lead',
      };
    }
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string): 'availability' | 'booking' | 'help' | 'unknown' {
    const lowerMessage = message.toLowerCase();

    const bookingKeywords = [
      'book',
      'reserve',
      'sign me up',
      'enroll',
      'register',
      'schedule me',
      'book me',
      'confirm booking',
    ];

    const availabilityKeywords = [
      'available',
      'do you have',
      'classes',
      'schedule',
      'times',
      'when',
      'what time',
      'open',
      'slots',
      'spots',
      'availability',
    ];

    const helpKeywords = ['help', 'how', 'info', 'tell me', 'question', 'support', 'assistance'];

    // Check for booking intent first (highest priority)
    if (bookingKeywords.some((kw) => lowerMessage.includes(kw))) {
      return 'booking';
    }

    // Check for availability
    if (availabilityKeywords.some((kw) => lowerMessage.includes(kw))) {
      return 'availability';
    }

    // Check for help
    if (helpKeywords.some((kw) => lowerMessage.includes(kw))) {
      return 'help';
    }

    return 'unknown';
  }

  /**
   * Extract date from natural language
   */
  private extractDate(message: string): string | undefined {
    const today = new Date();
    const lowerMessage = message.toLowerCase();

    // Tomorrow
    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Today
    if (lowerMessage.includes('today')) {
      return today.toISOString().split('T')[0];
    }

    // Day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerMessage.includes(days[i])) {
        const targetDate = new Date(today);
        const currentDay = today.getDay();
        let daysAhead = i - currentDay;

        if (daysAhead <= 0) {
          daysAhead += 7;
        }

        targetDate.setDate(targetDate.getDate() + daysAhead);
        return targetDate.toISOString().split('T')[0];
      }
    }

    return undefined;
  }

  /**
   * Extract class type from message
   */
  private extractClassType(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    const classTypes = ['pilates', 'mat pilates', 'reformer', 'fusion', 'yoga', 'flow'];

    for (const classType of classTypes) {
      if (lowerMessage.includes(classType)) {
        return classType.charAt(0).toUpperCase() + classType.slice(1);
      }
    }

    return 'Pilates'; // Default
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidence(
    intent: 'availability' | 'booking' | 'help' | 'unknown',
    message: string,
  ): number {
    if (intent === 'unknown') return 0.3;
    if (message.length < 10) return 0.5; // Short messages are less confident
    if (intent === 'booking' || intent === 'availability') return 0.9; // High confidence for clear intents
    return 0.7;
  }

  /**
   * Determine next step based on lead
   */
  private determineNextStep(lead: Lead): string {
    switch (lead.intent) {
      case 'availability':
        return 'check_availability';
      case 'booking':
        return 'process_booking';
      case 'help':
        return 'send_help_info';
      default:
        return 'ask_for_clarification';
    }
  }

  /**
   * Generate unique lead ID
   */
  private generateLeadId(): string {
    return `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get lead by ID
   */
  getLead(leadId: string): Lead | undefined {
    return this.leads.get(leadId);
  }

  /**
   * Get all leads
   */
  getAllLeads(): Lead[] {
    return Array.from(this.leads.values());
  }

  /**
   * Get leads by channel
   */
  getLeadsByChannel(channel: LeadChannel): Lead[] {
    return Array.from(this.leads.values()).filter((lead) => lead.channel === channel);
  }

  /**
   * Get leads by intent
   */
  getLeadsByIntent(intent: string): Lead[] {
    return Array.from(this.leads.values()).filter((lead) => lead.intent === intent);
  }

  /**
   * Get recent leads (last N)
   */
  getRecentLeads(limit: number = 10): Lead[] {
    return Array.from(this.leads.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get lead stats
   */
  getStats() {
    const leads = Array.from(this.leads.values());
    const byChannel: Record<string, number> = {};
    const byIntent: Record<string, number> = {};

    leads.forEach((lead) => {
      byChannel[lead.channel] = (byChannel[lead.channel] || 0) + 1;
      byIntent[lead.intent] = (byIntent[lead.intent] || 0) + 1;
    });

    return {
      totalLeads: leads.length,
      byChannel,
      byIntent,
      averageConfidence: leads.length > 0 ? leads.reduce((sum, l) => sum + l.confidence, 0) / leads.length : 0,
    };
  }
}

/**
 * Singleton instance
 */
let instance: LeadIntakeService | null = null;

export function getLeadIntakeService(): LeadIntakeService {
  if (!instance) {
    instance = new LeadIntakeService();
  }
  return instance;
}

export { LeadIntakeService };
