/**
 * SMS tRPC Routes
 * Handles SMS messaging through Twilio
 */

import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { twilioService } from '../../../lib/twilio';

// Send SMS procedure
export const sendSMSProcedure = protectedProcedure
  .input(z.object({
    to: z.string().min(10, 'Phone number must be at least 10 digits'),
    message: z.string().min(1, 'Message cannot be empty').max(1600, 'Message too long'),
    from: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    console.log('📱 Sending SMS:', { to: input.to, messageLength: input.message.length });
    
    const result = await twilioService.sendSMS({
      to: input.to,
      body: input.message,
      from: input.from
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Send verification code procedure
export const sendVerificationCodeProcedure = protectedProcedure
  .input(z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    code: z.string().length(6, 'Verification code must be 6 digits')
  }))
  .mutation(async ({ input }) => {
    console.log('🔐 Sending verification code to:', input.phoneNumber);
    
    const result = await twilioService.sendVerificationCode(input.phoneNumber, input.code);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send verification code');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Send event notification procedure
export const sendEventNotificationProcedure = protectedProcedure
  .input(z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    eventTitle: z.string().min(1, 'Event title is required'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message too long')
  }))
  .mutation(async ({ input }) => {
    console.log('📅 Sending event notification:', { event: input.eventTitle, to: input.phoneNumber });
    
    const result = await twilioService.sendEventNotification(
      input.phoneNumber,
      input.eventTitle,
      input.message
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send event notification');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Send booking confirmation procedure
export const sendBookingConfirmationProcedure = protectedProcedure
  .input(z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    bookingDetails: z.object({
      eventTitle: z.string().min(1, 'Event title is required'),
      date: z.string().min(1, 'Date is required'),
      location: z.string().min(1, 'Location is required'),
      confirmationCode: z.string().min(1, 'Confirmation code is required')
    })
  }))
  .mutation(async ({ input }) => {
    console.log('✅ Sending booking confirmation:', { 
      event: input.bookingDetails.eventTitle, 
      to: input.phoneNumber 
    });
    
    const result = await twilioService.sendBookingConfirmation(
      input.phoneNumber,
      input.bookingDetails
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send booking confirmation');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Send payment reminder procedure
export const sendPaymentReminderProcedure = protectedProcedure
  .input(z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    amount: z.number().positive('Amount must be positive'),
    dueDate: z.string().min(1, 'Due date is required')
  }))
  .mutation(async ({ input }) => {
    console.log('💰 Sending payment reminder:', { 
      amount: input.amount, 
      to: input.phoneNumber 
    });
    
    const result = await twilioService.sendPaymentReminder(
      input.phoneNumber,
      input.amount,
      input.dueDate
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send payment reminder');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Send proposal SMS procedure
export const sendProposalSMSProcedure = protectedProcedure
  .input(z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    proposalDetails: z.object({
      eventTitle: z.string().min(1, 'Event title is required'),
      eventDate: z.string().min(1, 'Event date is required'),
      invitationCode: z.string().min(1, 'Invitation code is required'),
      appDownloadLink: z.string().url().optional()
    })
  }))
  .mutation(async ({ input }) => {
    console.log('📱 Sending proposal SMS:', { 
      event: input.proposalDetails.eventTitle, 
      to: input.phoneNumber 
    });
    
    const result = await twilioService.sendProposalNotification(
      input.phoneNumber,
      input.proposalDetails
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send proposal SMS');
    }

    return {
      success: true,
      messageId: result.messageId
    };
  });

// Get SMS service status procedure
export const getSMSStatusProcedure = protectedProcedure
  .query(async () => {
    const status = twilioService.getStatus();
    
    return {
      ...status,
      isReady: twilioService.isReady()
    };
  });