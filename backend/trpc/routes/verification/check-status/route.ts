import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { getVerificationSession, isVerificationSuccessful, getVerificationDetails } from '@/backend/lib/stripe';
import { profileRepo, type ContractorProfile } from '@/backend/db/profile-repo';

export const checkVerificationStatusProcedure = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('[verification] Checking status for session:', input.sessionId);
    
    try {
      // Get verification session from Stripe
      const session = await getVerificationSession(input.sessionId);
      
      // Verify this session belongs to the current user
      if (session.metadata?.userId !== ctx.user?.id) {
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
      };
    } catch (error) {
      console.error('[verification] Failed to check status:', error);
      throw new Error('Failed to check verification status');
    }
  });