/**
 * Twilio SMS Service
 * Handles SMS messaging functionality using Twilio API
 */

import twilio from 'twilio';
import { config } from '../config/env';

interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class TwilioService {
  private client: twilio.Twilio | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.twilio) {
      console.warn('⚠️ Twilio not configured - SMS functionality will be disabled');
      return;
    }

    try {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.isConfigured = true;
      console.log('✅ Twilio SMS service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    if (!this.isConfigured || !this.client) {
      return {
        success: false,
        error: 'Twilio service not configured'
      };
    }

    try {
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(message.to.replace(/[\s\-\(\)]/g, ''))) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const result = await this.client.messages.create({
        body: message.body,
        to: message.to,
        from: message.from || config.twilio?.phoneNumber || undefined
      });

      console.log(`📱 SMS sent successfully to ${message.to}, SID: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid
      };
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResponse> {
    const message = {
      to: phoneNumber,
      body: `Your ${config.company.name} verification code is: ${code}. This code expires in 10 minutes.`
    };

    return this.sendSMS(message);
  }

  /**
   * Send event notification SMS
   */
  async sendEventNotification(phoneNumber: string, eventTitle: string, message: string): Promise<SMSResponse> {
    const smsMessage = {
      to: phoneNumber,
      body: `${config.company.name} Event Update: ${eventTitle}\n\n${message}`
    };

    return this.sendSMS(smsMessage);
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmation(phoneNumber: string, bookingDetails: {
    eventTitle: string;
    date: string;
    location: string;
    confirmationCode: string;
  }): Promise<SMSResponse> {
    const message = {
      to: phoneNumber,
      body: `Booking Confirmed! 🎉\n\nEvent: ${bookingDetails.eventTitle}\nDate: ${bookingDetails.date}\nLocation: ${bookingDetails.location}\nConfirmation: ${bookingDetails.confirmationCode}\n\nSee you there!`
    };

    return this.sendSMS(message);
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminder(phoneNumber: string, amount: number, dueDate: string): Promise<SMSResponse> {
    const message = {
      to: phoneNumber,
      body: `Payment Reminder: You have a pending payment of ${amount.toFixed(2)} due on ${dueDate}. Please complete your payment to avoid service interruption.`
    };

    return this.sendSMS(message);
  }

  /**
   * Send proposal SMS notification
   */
  async sendProposalNotification(phoneNumber: string, proposalDetails: {
    eventTitle: string;
    eventDate: string;
    invitationCode: string;
    appDownloadLink?: string;
  }): Promise<SMSResponse> {
    const appLink = proposalDetails.appDownloadLink || 'https://revovend.com/app';
    
    const message = {
      to: phoneNumber,
      body: `A RevoVend Business would like to request a table at your event ${proposalDetails.eventTitle} for ${proposalDetails.eventDate}. Please check your email for more details or download the RevoVend App at ${appLink} and use this invite code: ${proposalDetails.invitationCode}`
    };

    return this.sendSMS(message);
  }

  /**
   * Check if Twilio is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; ready: boolean; hasPhoneNumber: boolean } {
    return {
      configured: !!config.twilio,
      ready: this.isConfigured,
      hasPhoneNumber: !!config.twilio?.phoneNumber
    };
  }
}

// Export singleton instance
export const twilioService = new TwilioService();

// Export types
export type { SMSMessage, SMSResponse };