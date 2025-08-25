import { useState, useCallback } from 'react';
import { TRPCClientError } from '@trpc/client';

export interface VerificationError {
  isVerificationRequired: boolean;
  message: string;
  userType: 'contractor' | 'business_owner' | 'event_host';
  action: 'apply_to_job' | 'hire_contractor' | 'accept_payment' | 'send_proposal';
}

export function useVerificationHandler() {
  const [verificationPrompt, setVerificationPrompt] = useState<VerificationError | null>(null);

  const handleError = useCallback((error: unknown, action: VerificationError['action']) => {
    if (error instanceof TRPCClientError) {
      const message = error.message;
      
      if (message.startsWith('VERIFICATION_REQUIRED:')) {
        const verificationMessage = message.replace('VERIFICATION_REQUIRED: ', '');
        
        // Determine user type based on the action and message
        let userType: VerificationError['userType'] = 'contractor';
        
        if (action === 'hire_contractor' || action === 'send_proposal') {
          if (message.includes('business owner') || message.includes('Business owner')) {
            userType = 'business_owner';
          } else if (message.includes('event host') || message.includes('Event host')) {
            userType = 'event_host';
          }
        } else if (action === 'accept_payment') {
          userType = 'event_host';
        } else if (action === 'apply_to_job') {
          userType = 'contractor';
        }
        
        setVerificationPrompt({
          isVerificationRequired: true,
          message: verificationMessage,
          userType,
          action,
        });
        
        return true; // Handled as verification error
      }
    }
    
    return false; // Not a verification error
  }, []);

  const closeVerificationPrompt = useCallback(() => {
    setVerificationPrompt(null);
  }, []);

  return {
    verificationPrompt,
    handleError,
    closeVerificationPrompt,
  };
}