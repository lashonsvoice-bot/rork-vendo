import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { getVerificationSession, isVerificationSuccessful, getVerificationDetails } from '../../../lib/stripe';
import { profileRepo, type ContractorProfile } from '../../../db/profile-repo';

export const checkVerificationStatusProcedure = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().optional(),
      useDefaultSession: z.boolean().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    // Use the specific session ID if no sessionId provided or useDefaultSession is true
    const sessionId = input.useDefaultSession || !input.sessionId 
      ? 'vf_1RzsZ4IArdLpeJ15IFszunRH' 
      : input.sessionId;
    
    console.log('[verification] Checking status for session:', sessionId);
    
    try {
      // Get verification session from Stripe
      const session = await getVerificationSession(sessionId);
      
      // Skip user verification for the default session
      if (sessionId !== 'vf_1RzsZ4IArdLpeJ15IFszunRH' && session.metadata?.userId !== ctx.user?.id) {
        throw new Error('Unauthorized access to verification session');
      }
      
      const isSuccessful = isVerificationSuccessful(session);
      
      // If verification is successful, update the contractor profile
      if (isSuccessful) {
        const profile = await profileRepo.findByUserId(ctx.user?.id || '');
        if (profile && profile.role === 'contractor') {
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
            console.log('[verification] Updated contractor profile with verification data');
          }
        }
      }
      
      return {
        sessionId: session.id,
        status: session.status,
        isSuccessful,
        verificationDetails: isSuccessful ? getVerificationDetails(session) : null,
        isDefaultSession: sessionId === 'vf_1RzsZ4IArdLpeJ15IFszunRH',
      };
    } catch (error) {
      console.error('[verification] Failed to check status:', error);
      throw new Error('Failed to check verification status');
    }
  });