import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";

export const upgradeSubscriptionProcedure = protectedProcedure
  .input(z.object({
    tier: z.enum(["starter", "professional", "enterprise"]),
    billingCycle: z.enum(["monthly", "yearly"]),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can upgrade subscriptions");
    }

    console.log("Upgrading subscription for user:", ctx.user.id, "to tier:", input.tier);

    const existingSubscription = await subscriptionRepo.findByUserId(ctx.user.id);
    if (!existingSubscription) {
      throw new Error("No subscription found");
    }

    const { eventsLimit, pricePerMonth } = subscriptionRepo.getSubscriptionLimits(input.tier);
    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + (input.billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000);

    const updatedSubscription = await subscriptionRepo.updateSubscription(ctx.user.id, {
      tier: input.tier,
      status: "active",
      billingCycle: input.billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: nextPeriodEnd.toISOString(),
      eventsLimit,
      pricePerMonth: input.billingCycle === "yearly" ? Math.floor(pricePerMonth * 0.8) : pricePerMonth, // 20% discount for yearly
      trialEnd: undefined, // Remove trial end when upgrading
    });

    return updatedSubscription;
  });