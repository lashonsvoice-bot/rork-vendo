import { z } from 'zod';
import { protectedProcedure } from '../../create-context';

const createReferralCodeInput = z.object({
  maxUses: z.number().optional(),
});

const useReferralCodeInput = z.object({
  code: z.string(),
});

const payRewardInput = z.object({
  usageId: z.string(),
});

const processSubscriptionInput = z.object({
  refereeId: z.string(),
  subscriptionAmount: z.number(),
});

// Create referral code
const createReferralCodeProcedure = protectedProcedure
  .input(createReferralCodeInput)
  .mutation(async ({ ctx, input }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    
    console.log('[Referral] Creating referral code for user:', ctx.user?.id);
    
    const referralCode = await referralRepo.createReferralCode(
      ctx.user!.id,
      ctx.user!.role === 'event_host' ? 'host' : ctx.user!.role,
      input.maxUses
    );
    
    return referralCode;
  });

// Use referral code during signup
const useReferralCodeProcedure = protectedProcedure
  .input(useReferralCodeInput)
  .mutation(async ({ ctx, input }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    
    console.log('[Referral] Using referral code:', input.code, 'for user:', ctx.user?.id);
    
    const referralCode = await referralRepo.getReferralCodeByCode(input.code);
    if (!referralCode) {
      throw new Error('Invalid referral code');
    }
    
    const usage = await referralRepo.recordReferralUsage(
      referralCode.id,
      ctx.user!.id,
      ctx.user!.role === 'event_host' ? 'host' : ctx.user!.role
    );
    
    return { usage, referralCode };
  });

// Get user's referral stats
const getStatsProc = protectedProcedure
  .query(async ({ ctx }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    
    const stats = await referralRepo.getReferralStats(ctx.user!.id);
    return stats;
  });

// Get user's referral history
const getHistoryProc = protectedProcedure
  .query(async ({ ctx }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    
    const history = await referralRepo.getReferralHistory(ctx.user!.id);
    return history;
  });

// Process subscription reward (admin/system use)
const processSubscriptionRewardProcedure = protectedProcedure
  .input(processSubscriptionInput)
  .mutation(async ({ input }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    
    console.log('[Referral] Processing subscription reward for:', input.refereeId);
    
    const result = await referralRepo.processSubscriptionReward(
      input.refereeId,
      input.subscriptionAmount
    );
    
    return result;
  });

// Pay referral reward
const payRewardProcedure = protectedProcedure
  .input(payRewardInput)
  .mutation(async ({ ctx, input }) => {
    const { referralRepo } = await import('../../../db/referral-repo');
    const { walletRepo } = await import('../../../db/wallet-repo');
    
    console.log('[Referral] Paying reward for usage:', input.usageId);
    
    const usage = await referralRepo.payReferralReward(input.usageId);
    
    // Add funds to referrer's wallet
    const referralCode = (await referralRepo.getReferralHistory(ctx.user!.id)).codes
      .find(code => code.id === usage.referralCodeId);
    
    if (referralCode) {
      await walletRepo.deposit(
        referralCode.referrerId,
        usage.rewardAmount,
        usage.id
      );
    }
    
    return usage;
  });

export const referralRouter = {
  create: createReferralCodeProcedure,
  use: useReferralCodeProcedure,
  stats: getStatsProc,
  history: getHistoryProc,
  processSubscription: processSubscriptionRewardProcedure,
  payReward: payRewardProcedure,
};