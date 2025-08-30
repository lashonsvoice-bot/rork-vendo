import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { hostCreditsRepo } from "../../../../db/host-credits-repo";
import { TRPCError } from "@trpc/server";

// Get host credits balance
export const getCreditsBalance = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    if (ctx.user.role !== "event_host") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only event hosts can view credits"
      });
    }
    
    const availableCredits = await hostCreditsRepo.getAvailableCredits(ctx.user.id);
    const creditHistory = await hostCreditsRepo.getCreditHistory(ctx.user.id);
    const allCredits = await hostCreditsRepo.readAllCredits();
    const userCredits = allCredits.filter((c: any) => c.hostId === ctx.user!.id);
    
    return {
      availableCredits,
      creditHistory,
      credits: userCredits
    };
  });

// Use credits for reverse proposal
export const useCreditsForProposal = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    amount: z.number().min(1)
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    if (ctx.user.role !== "event_host") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only event hosts can use credits"
      });
    }
    
    const success = await hostCreditsRepo.useCredits(
      ctx.user.id,
      input.amount,
      input.eventId,
      `Used for reverse proposal to event ${input.eventId}`
    );
    
    if (!success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient credits"
      });
    }
    
    return {
      success: true,
      remainingCredits: await hostCreditsRepo.getAvailableCredits(ctx.user.id)
    };
  });

// Grant referral reward credits
export const grantReferralCredits = protectedProcedure
  .input(z.object({
    referrerId: z.string(),
    refereeId: z.string(),
    amount: z.number().min(1)
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    // This would typically be called by an admin or system process
    // For now, we'll allow it for testing
    
    const credit = await hostCreditsRepo.grantCredits(
      input.referrerId,
      input.amount,
      "referral_reward",
      `Referral reward for bringing ${input.refereeId}`,
      // Credits expire in 90 days
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    );
    
    return {
      success: true,
      credit
    };
  });

// Purchase credits
export const purchaseCredits = protectedProcedure
  .input(z.object({
    amount: z.number().min(1),
    paymentMethodId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    if (ctx.user.role !== "event_host") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only event hosts can purchase credits"
      });
    }
    
    // TODO: Process payment via Stripe
    // For now, we'll just grant the credits
    
    const credit = await hostCreditsRepo.grantCredits(
      ctx.user.id,
      input.amount,
      "purchase",
      `Purchased ${input.amount} credits`,
      // Purchased credits don't expire
      undefined
    );
    
    return {
      success: true,
      credit,
      totalCredits: await hostCreditsRepo.getAvailableCredits(ctx.user.id)
    };
  });

// Check and expire old credits (system task)
export const expireCredits = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    // This would typically be a scheduled task
    await hostCreditsRepo.expireOldCredits();
    
    return {
      success: true
    };
  });