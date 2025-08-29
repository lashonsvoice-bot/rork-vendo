/**
 * Ambassador Referral Management Routes
 */

import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { getAmbassadorRepository } from '../../../../db/ambassador-repo';
import { TRPCError } from '@trpc/server';

// Middleware to check if user is an ambassador
const ambassadorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if the request is from an ambassador
  // This would normally check the JWT token type
  return next({ ctx });
});

export const createReferral = ambassadorProcedure
  .input(z.object({
    ambassadorId: z.string(),
    referredEmail: z.string().email(),
    referredRole: z.enum(['business_owner', 'host', 'contractor'])
  }))
  .mutation(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    // Generate referral link
    const referralLink = await repo.generateReferralLink(input.ambassadorId, input.referredRole);

    // Create referral record
    const referral = await repo.createReferral({
      ...input,
      referralLink
    });

    return {
      success: true,
      referral,
      referralLink
    };
  });

export const getReferrals = ambassadorProcedure
  .input(z.object({
    ambassadorId: z.string()
  }))
  .query(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    const referrals = await repo.findReferralsByAmbassador(input.ambassadorId);
    
    return {
      success: true,
      referrals
    };
  });

export const getAmbassadorStats = ambassadorProcedure
  .input(z.object({
    ambassadorId: z.string()
  }))
  .query(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    const stats = await repo.getAmbassadorStats(input.ambassadorId);
    
    return {
      success: true,
      stats
    };
  });

export const generateReferralLink = ambassadorProcedure
  .input(z.object({
    ambassadorId: z.string(),
    targetRole: z.enum(['business_owner', 'host', 'contractor'])
  }))
  .mutation(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    const link = await repo.generateReferralLink(input.ambassadorId, input.targetRole);
    
    return {
      success: true,
      referralLink: link
    };
  });

export const trackReferralConversion = protectedProcedure
  .input(z.object({
    referredEmail: z.string().email(),
    subscriptionId: z.string(),
    subscriptionAmount: z.number()
  }))
  .mutation(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    // Find the referral
    const referral = await repo.findReferralByEmail(input.referredEmail);
    
    if (!referral) {
      return {
        success: false,
        message: 'No referral found for this email'
      };
    }

    // Calculate commission (20% for ambassadors)
    const commissionAmount = input.subscriptionAmount * 0.20;

    // Convert the referral
    await repo.convertReferral(
      referral.id,
      input.subscriptionId,
      commissionAmount
    );

    return {
      success: true,
      commissionAmount
    };
  });