import { z } from 'zod';
import { protectedProcedure, type Context } from '../../create-context';
import { createVerificationSession, getVerificationSession } from '../../../lib/stripe';
import { profileRepo } from '../../../db/profile-repo';

export const createVerificationSessionProcedure = protectedProcedure
  .input(
    z.object({
      returnUrl: z.string().url(),
      useExistingSession: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }
    
    const user = ctx.user;
    console.log('[verification] Creating verification session for user:', user.id);
    
    try {
      // Get user profile to ensure they're a contractor
      const profile = await profileRepo.findByUserId(user.id);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      if (profile.role !== 'contractor') {
        throw new Error('ID verification is only available for contractors');
      }
      
      // Check if we should use the existing verification session
      const existingSessionId = 'vf_1RzsZ4IArdLpeJ15IFszunRH';
      
      if (input.useExistingSession) {
        try {
          // Try to retrieve the existing session
          const existingSession = await getVerificationSession(existingSessionId);
          console.log('[verification] Using existing session:', existingSession.id);
          
          return {
            sessionId: existingSession.id,
            url: existingSession.url,
            status: existingSession.status,
            isExisting: true,
          };
        } catch (error) {
          console.log('[verification] Existing session not found or invalid, creating new one');
        }
      }
      
      // Create new Stripe verification session
      const session = await createVerificationSession({
        returnUrl: input.returnUrl,
        metadata: {
          userId: user.id,
          profileId: profile.id,
          email: user.email,
        },
      });
      
      console.log('[verification] Created new session:', session.id);
      
      return {
        sessionId: session.id,
        url: session.url,
        status: session.status,
        isExisting: false,
      };
    } catch (error) {
      console.error('[verification] Failed to create session:', error);
      throw new Error('Failed to create verification session');
    }
  });