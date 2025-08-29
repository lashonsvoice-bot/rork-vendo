import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { hostCreditsRepo } from '../../../../db/host-credits-repo';
import { referralRepo } from '../../../../db/referral-repo';

// Credit costs for different actions
const CREDIT_COSTS = {
  INTERNAL_REVERSE_PROPOSAL: 1, // 1 credit per internal reverse proposal
};

// Credit rewards
const CREDIT_REWARDS = {
  REFERRAL_CONVERSION: 5, // 5 credits when a referral converts
};

export const getHostCredits = protectedProcedure
  .query(async ({ ctx }) => {
    const credits = await hostCreditsRepo.getCredits(ctx.user.id);
    if (!credits) {
      return await hostCreditsRepo.initializeCredits(ctx.user.id);
    }
    return credits;
  });

export const getHostCreditTransactions = protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).optional().default(50)
  }))
  .query(async ({ ctx, input }) => {
    return await hostCreditsRepo.getTransactions(ctx.user.id, input.limit);
  });

export const useCreditsForInternalProposal = protectedProcedure
  .input(z.object({
    proposalId: z.string(),
    recipientId: z.string(),
    eventId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    // Check if user has enough credits
    const credits = await hostCreditsRepo.getCredits(ctx.user.id);
    if (!credits || credits.balance < CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL) {
      throw new Error('Insufficient credits for internal reverse proposal');
    }

    // Use credits
    const updatedCredits = await hostCreditsRepo.useCredits(
      ctx.user.id,
      CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      `Internal reverse proposal to contractor for event`,
      input.proposalId
    );

    return {
      success: true,
      creditsUsed: CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      remainingCredits: updatedCredits.balance
    };
  });

export const awardReferralCredits = protectedProcedure
  .input(z.object({
    referralId: z.string(),
    conversionType: z.enum(['subscription', 'pro_upgrade'])
  }))
  .mutation(async ({ ctx, input }) => {
    // Get referral details
    const referral = await referralRepo.getReferralById(input.referralId);
    if (!referral || referral.referrerId !== ctx.user.id) {
      throw new Error('Invalid referral');
    }

    // Award credits based on conversion type
    let creditsToAward = CREDIT_REWARDS.REFERRAL_CONVERSION;
    let description = `Referral conversion bonus`;

    if (input.conversionType === 'subscription') {
      description = `Business referral converted to subscription`;
    } else if (input.conversionType === 'pro_upgrade') {
      description = `Contractor referral upgraded to Pro`;
    }

    const updatedCredits = await hostCreditsRepo.addCredits(
      ctx.user.id,
      creditsToAward,
      description,
      input.referralId,
      'referral'
    );

    return {
      success: true,
      creditsAwarded: creditsToAward,
      totalCredits: updatedCredits.balance
    };
  });

export const checkCreditsForProposal = protectedProcedure
  .input(z.object({
    proposalType: z.enum(['internal', 'external'])
  }))
  .query(async ({ ctx, input }) => {
    if (input.proposalType === 'external') {
      // External proposals don't use credits, they use monetary payment
      return {
        canSend: true,
        requiresCredits: false,
        requiresPayment: true,
        message: 'External reverse proposals require monetary payment'
      };
    }

    // Internal proposals use credits
    const credits = await hostCreditsRepo.getCredits(ctx.user.id);
    const hasEnoughCredits = credits && credits.balance >= CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL;

    return {
      canSend: hasEnoughCredits,
      requiresCredits: true,
      requiresPayment: false,
      creditsRequired: CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      currentBalance: credits?.balance || 0,
      message: hasEnoughCredits 
        ? `You have ${credits?.balance} credits available`
        : `You need ${CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL} credit(s) to send an internal reverse proposal. You have ${credits?.balance || 0} credits.`
    };
  });

export const purchaseCredits = protectedProcedure
  .input(z.object({
    amount: z.number().min(1).max(100),
    paymentIntentId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    // This would integrate with Stripe to verify payment
    // For now, we'll add credits directly after payment verification
    
    const pricePerCredit = 1; // $1 per credit
    const totalCost = input.amount * pricePerCredit;
    
    // TODO: Verify payment with Stripe using paymentIntentId
    
    const updatedCredits = await hostCreditsRepo.addCredits(
      ctx.user.id,
      input.amount,
      `Purchased ${input.amount} credits`,
      input.paymentIntentId,
      'purchase'
    );

    return {
      success: true,
      creditsPurchased: input.amount,
      totalCredits: updatedCredits.balance,
      amountCharged: totalCost
    };
  });