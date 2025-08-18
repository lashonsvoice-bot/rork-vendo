/**
 * SMS Store Hook
 * Manages SMS functionality state and operations
 */

import { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';

interface SMSState {
  isLoading: boolean;
  error: string | null;
  lastMessageId: string | null;
}

interface SMSActions {
  sendSMS: (to: string, message: string, from?: string) => Promise<boolean>;
  sendVerificationCode: (phoneNumber: string, code: string) => Promise<boolean>;
  sendEventNotification: (phoneNumber: string, eventTitle: string, message: string) => Promise<boolean>;
  sendBookingConfirmation: (phoneNumber: string, bookingDetails: {
    eventTitle: string;
    date: string;
    location: string;
    confirmationCode: string;
  }) => Promise<boolean>;
  sendPaymentReminder: (phoneNumber: string, amount: number, dueDate: string) => Promise<boolean>;
  clearError: () => void;
  getSMSStatus: () => Promise<{
    configured: boolean;
    ready: boolean;
    hasPhoneNumber: boolean;
    isReady: boolean;
  } | null>;
}

export const [SMSProvider, useSMS] = createContextHook((): SMSState & SMSActions => {
  const [state, setState] = useState<SMSState>({
    isLoading: false,
    error: null,
    lastMessageId: null
  });

  const sendSMSMutation = trpc.sms.send.useMutation();
  const sendVerificationCodeMutation = trpc.sms.sendVerificationCode.useMutation();
  const sendEventNotificationMutation = trpc.sms.sendEventNotification.useMutation();
  const sendBookingConfirmationMutation = trpc.sms.sendBookingConfirmation.useMutation();
  const sendPaymentReminderMutation = trpc.sms.sendPaymentReminder.useMutation();
  const getSMSStatusQuery = trpc.sms.getStatus.useQuery();

  const handleMutationResult = useCallback((result: { success: boolean; messageId?: string }, error: any): boolean => {
    if (error) {
      console.error('SMS Error:', error);
      setState(prev => ({ ...prev, isLoading: false, error: error.message || 'Failed to send SMS' }));
      return false;
    }

    if (result.success) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null, 
        lastMessageId: result.messageId || null 
      }));
      return true;
    }

    setState(prev => ({ ...prev, isLoading: false, error: 'Failed to send SMS' }));
    return false;
  }, []);

  const sendSMS = useCallback(async (to: string, message: string, from?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await sendSMSMutation.mutateAsync({ to, message, from });
      return handleMutationResult(result, null);
    } catch (error) {
      return handleMutationResult({ success: false }, error);
    }
  }, [sendSMSMutation, handleMutationResult]);

  const sendVerificationCode = useCallback(async (phoneNumber: string, code: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await sendVerificationCodeMutation.mutateAsync({ phoneNumber, code });
      return handleMutationResult(result, null);
    } catch (error) {
      return handleMutationResult({ success: false }, error);
    }
  }, [sendVerificationCodeMutation, handleMutationResult]);

  const sendEventNotification = useCallback(async (phoneNumber: string, eventTitle: string, message: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await sendEventNotificationMutation.mutateAsync({ phoneNumber, eventTitle, message });
      return handleMutationResult(result, null);
    } catch (error) {
      return handleMutationResult({ success: false }, error);
    }
  }, [sendEventNotificationMutation, handleMutationResult]);

  const sendBookingConfirmation = useCallback(async (phoneNumber: string, bookingDetails: {
    eventTitle: string;
    date: string;
    location: string;
    confirmationCode: string;
  }): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await sendBookingConfirmationMutation.mutateAsync({ phoneNumber, bookingDetails });
      return handleMutationResult(result, null);
    } catch (error) {
      return handleMutationResult({ success: false }, error);
    }
  }, [sendBookingConfirmationMutation, handleMutationResult]);

  const sendPaymentReminder = useCallback(async (phoneNumber: string, amount: number, dueDate: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await sendPaymentReminderMutation.mutateAsync({ phoneNumber, amount, dueDate });
      return handleMutationResult(result, null);
    } catch (error) {
      return handleMutationResult({ success: false }, error);
    }
  }, [sendPaymentReminderMutation, handleMutationResult]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getSMSStatus = useCallback(async () => {
    try {
      await getSMSStatusQuery.refetch();
      return getSMSStatusQuery.data || null;
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      return null;
    }
  }, [getSMSStatusQuery]);

  return useMemo(() => ({
    ...state,
    sendSMS,
    sendVerificationCode,
    sendEventNotification,
    sendBookingConfirmation,
    sendPaymentReminder,
    clearError,
    getSMSStatus
  }), [state, sendSMS, sendVerificationCode, sendEventNotification, sendBookingConfirmation, sendPaymentReminder, clearError, getSMSStatus]);
});