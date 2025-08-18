/**
 * SendGrid Email Service
 * Handles transactional email functionality using SendGrid API
 */

import sgMail from '@sendgrid/mail';
import { config } from '../config/env';

interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: {
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }[];
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SendGridService {
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.sendgrid.apiKey) {
      console.warn('⚠️ SendGrid not configured - Email functionality will be disabled');
      return;
    }

    try {
      sgMail.setApiKey(config.sendgrid.apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email message
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'SendGrid service not configured'
      };
    }

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      
      for (const email of recipients) {
        if (!emailRegex.test(email)) {
          return {
            success: false,
            error: `Invalid email format: ${email}`
          };
        }
      }

      const emailData = {
        to: message.to,
        from: config.sendgrid.fromEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
        attachments: message.attachments
      };

      const result = await sgMail.send(emailData as any);
      
      console.log(`📧 Email sent successfully to ${message.to}, Status: ${result[0].statusCode}`);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'] as string
      };
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Send proposal notification email (Business to Host)
   */
  async sendProposalEmail(hostEmail: string, proposalDetails: {
    businessName: string;
    businessOwnerName: string;
    businessOwnerContactEmail?: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    proposedAmount: number;
    supervisoryFee: number;
    message: string;
    invitationCode: string;
    pdfAttachment?: {
      content: string;
      filename: string;
    };
  }): Promise<EmailResponse> {
    const replyToEmail = proposalDetails.businessOwnerContactEmail || config.sendgrid.fromEmail;
    const subjectLine = `A RevoVend vendor wants to secure a table at ${proposalDetails.eventTitle}`;
    
    const emailContent = `Greetings,

${proposalDetails.businessName} located in ${proposalDetails.eventLocation.split(',')[1]?.trim() || 'our location'} would like to RevoVend at your ${proposalDetails.eventTitle} on ${proposalDetails.eventDate}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.

We want to pay $${proposalDetails.proposedAmount} today for a table or booth as well as an additional supervisory fee of $${proposalDetails.supervisoryFee} for you to ensure our team has materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.

Custom Message from ${proposalDetails.businessOwnerName}:
${proposalDetails.message}

If you accept this proposal, please use the following invite code when you log into the RevoVend App:

INVITATION CODE: ${proposalDetails.invitationCode}

The more vendors see that you are a RevoVend Host, the more your events could be filled remotely with vendors from all around the world.

Download the RevoVend App:
• iOS: [App Store Link]
• Android: [Google Play Link]

For questions, please reply to: ${replyToEmail}

—
${config.company.name}
${config.company.address}
Logo: ${config.company.logoUrl}
${config.company.complianceFooter}

Best regards,
${proposalDetails.businessOwnerName}
${proposalDetails.businessName}`;

    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    const emailMessage: EmailMessage = {
      to: hostEmail,
      subject: subjectLine,
      text: emailContent,
      html: htmlContent,
      replyTo: replyToEmail
    };

    // Add PDF attachment if provided
    if (proposalDetails.pdfAttachment) {
      emailMessage.attachments = [{
        content: proposalDetails.pdfAttachment.content,
        filename: proposalDetails.pdfAttachment.filename,
        type: 'application/pdf',
        disposition: 'attachment'
      }];
    }

    return this.sendEmail(emailMessage);
  }

  /**
   * Send reverse proposal notification email (Host to External Business)
   */
  async sendReverseProposalEmail(businessEmail: string, proposalDetails: {
    hostName: string;
    hostEmail: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    message: string;
    invitationCode: string;
    pdfAttachment?: {
      content: string;
      filename: string;
    };
  }): Promise<EmailResponse> {
    const subjectLine = `RevoVend Host Invitation: Remote Vendor Opportunity at ${proposalDetails.eventTitle}`;
    
    const emailContent = `Hello,

I hope this message finds you well. My name is ${proposalDetails.hostName}, and I am hosting ${proposalDetails.eventTitle} on ${proposalDetails.eventDate} in ${proposalDetails.eventLocation}.

I would like to invite you to set up a remote vendor table at my event. We feel your business would be a great fit at our event. With RevoVend, distance is no issue! You can participate in our event remotely by sending trained professionals to represent your business.

Event Details:
• Event: ${proposalDetails.eventTitle}
• Date: ${proposalDetails.eventDate}
• Location: ${proposalDetails.eventLocation}

Personal Message:
${proposalDetails.message}

To accept this invitation and connect with me directly, please:
1. Download the RevoVend App:
   • iOS: [App Store Link]
   • Android: [Google Play Link]

2. Use this invitation code when registering: ${proposalDetails.invitationCode}

This will allow us to communicate directly through the app and finalize all the details for your remote participation.

I look forward to having your business as part of our event!

Best regards,
${proposalDetails.hostName}
Event Host
${proposalDetails.hostEmail}

—
${config.company.name}
${config.company.address}
Logo: ${config.company.logoUrl}
${config.company.complianceFooter}`;

    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    const emailMessage: EmailMessage = {
      to: businessEmail,
      subject: subjectLine,
      text: emailContent,
      html: htmlContent,
      replyTo: proposalDetails.hostEmail
    };

    // Add PDF attachment if provided
    if (proposalDetails.pdfAttachment) {
      emailMessage.attachments = [{
        content: proposalDetails.pdfAttachment.content,
        filename: proposalDetails.pdfAttachment.filename,
        type: 'application/pdf',
        disposition: 'attachment'
      }];
    }

    return this.sendEmail(emailMessage);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userEmail: string, userName: string, userType: 'host' | 'vendor'): Promise<EmailResponse> {
    const subjectLine = `Welcome to ${config.company.name}!`;
    
    const emailContent = `Hello ${userName},

Welcome to ${config.company.name}! We're excited to have you join our community of ${userType === 'host' ? 'event hosts' : 'vendors'}.

${userType === 'host' 
  ? 'As a host, you can now connect with vendors from around the world who want to participate in your events remotely. This opens up new revenue opportunities and brings diverse offerings to your events.'
  : 'As a vendor, you can now participate in events remotely by sending trained professionals to represent your business. This allows you to expand your reach without the travel costs and time commitment.'
}

Get started by:
• Completing your profile
• ${userType === 'host' ? 'Creating your first event listing' : 'Browsing available events'}
• Connecting with other ${userType === 'host' ? 'vendors' : 'hosts'} in your area

If you have any questions, feel free to reach out to our support team at ${config.company.supportEmail}.

Best regards,
The ${config.company.name} Team

—
${config.company.name}
${config.company.address}
${config.company.complianceFooter}`;

    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    return this.sendEmail({
      to: userEmail,
      subject: subjectLine,
      text: emailContent,
      html: htmlContent
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail: string, resetToken: string, resetUrl: string): Promise<EmailResponse> {
    const subjectLine = `Reset Your ${config.company.name} Password`;
    
    const emailContent = `Hello,

We received a request to reset your password for your ${config.company.name} account.

To reset your password, click the link below:
${resetUrl}

Or use this reset code: ${resetToken}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The ${config.company.name} Team

—
${config.company.name}
${config.company.address}
${config.company.complianceFooter}`;

    const htmlContent = emailContent.replace(/\n/g, '<br/>');

    return this.sendEmail({
      to: userEmail,
      subject: subjectLine,
      text: emailContent,
      html: htmlContent
    });
  }

  /**
   * Check if SendGrid is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; ready: boolean; fromEmail: string } {
    return {
      configured: !!config.sendgrid.apiKey,
      ready: this.isConfigured,
      fromEmail: config.sendgrid.fromEmail
    };
  }
}

// Export singleton instance
export const sendGridService = new SendGridService();

// Export types
export type { EmailMessage, EmailResponse };