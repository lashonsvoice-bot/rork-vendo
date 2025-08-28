import { protectedProcedure } from '../../../create-context';
import { getVerificationSession, isVerificationSuccessful, getVerificationDetails } from '../../../lib/stripe';
import { profileRepo, type ContractorProfile } from '../../../db/profile-repo';
import { config } from '../../../config/env';

export const useDefaultVerificationSessionProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    // Check if default verification session is enabled
    if (!config.verification.enableDefaultSession || !config.verification.defaultSessionId) {
      throw new Error('Default verification session is not available in this environment');
    }
    
    console.log('[verification] Using default verification session for user:', ctx.user.id);
    
    try {
      // Get user profile to ensure they're a contractor
      const profile = await profileRepo.findByUserId(ctx.user.id);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      if (profile.role !== 'contractor') {
        throw new Error('ID verification is only available for contractors');
      }
      
      // Get the default verification session from Stripe
      const session = await getVerificationSession(config.verification.defaultSessionId!);
      console.log('[verification] Retrieved default session:', session.id, 'Status:', session.status);
      
      const isSuccessful = isVerificationSuccessful(session);
      
      // If verification is successful, update the contractor profile
      if (isSuccessful) {
        const verificationDetails = getVerificationDetails(session);
        
        if (verificationDetails) {
          const updatedProfile: ContractorProfile = {
            ...profile,
            isVerified: true,
            verificationDate: verificationDetails.verifiedAt,
            verificationSessionId: session.id,
            verifiedName: `${verificationDetails.firstName} ${verificationDetails.lastName}`,
            verifiedAddress: verificationDetails.address,
            verifiedDateOfBirth: verificationDetails.dateOfBirth,
          } as ContractorProfile & {
            isVerified: boolean;
            verificationDate: string;
            verificationSessionId: string;
            verifiedName: string;
            verifiedAddress: any;
            verifiedDateOfBirth: any;
          };
          
          await profileRepo.upsert(updatedProfile);
          console.log('[verification] Updated contractor profile with default verification data');
        }
      }
      
      return {
        sessionId: session.id,
        url: session.url,
        status: session.status,
        isSuccessful,
        verificationDetails: isSuccessful ? getVerificationDetails(session) : null,
        message: isSuccessful 
          ? 'Verification successful! Your contractor profile has been verified.' 
          : 'Verification session found but not yet completed.',
      };
    } catch (error) {
      console.error('[verification] Failed to use default session:', error);
      throw new Error('Failed to access default verification session');
    }
  });

export const getDefaultVerificationStatusProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    console.log('[verification] Getting default verification session status');
    
    // Check if default verification session is enabled
    if (!config.verification.enableDefaultSession || !config.verification.defaultSessionId) {
      return {
        sessionId: null,
        url: null,
        status: 'unavailable',
        isSuccessful: false,
        verificationDetails: null,
        canUseForVerification: false,
        error: 'Default verification session is not available in this environment',
      };
    }
    
    try {
      // Get the default verification session from Stripe
      const session = await getVerificationSession(config.verification.defaultSessionId!);
      const isSuccessful = isVerificationSuccessful(session);
      
      return {
        sessionId: session.id,
        url: session.url,
        status: session.status,
        isSuccessful,
        verificationDetails: isSuccessful ? getVerificationDetails(session) : null,
        canUseForVerification: true,
      };
    } catch (error) {
      console.error('[verification] Failed to get default session status:', error);
      return {
        sessionId: config.verification.defaultSessionId,
        url: null,
        status: 'error',
        isSuccessful: false,
        verificationDetails: null,
        canUseForVerification: false,
        error: 'Default verification session not accessible',
      };
    }
  });