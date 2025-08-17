import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";

export const recordEventUsageProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    eventDate: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can record event usage");
    }

    console.log("Recording event usage for user:", ctx.user.id, "event:", input.eventId);

    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    if (!subscription) {
      throw new Error("No subscription found");
    }

    // Check if user has exceeded their limit
    if (subscription.eventsLimit !== -1 && subscription.eventsUsed >= subscription.eventsLimit) {
      throw new Error("Event limit exceeded. Please upgrade your subscription.");
    }

    // Check if trial has expired
    if (subscription.status === "trialing" && subscription.trialEnd) {
      const trialEndDate = new Date(subscription.trialEnd);
      const now = new Date();
      if (now > trialEndDate) {
        throw new Error("Free trial has expired. Please upgrade your subscription.");
      }
    }

    const usage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      userId: ctx.user.id,
      eventId: input.eventId,
      eventDate: input.eventDate,
      createdAt: new Date().toISOString(),
    };

    const recordedUsage = await subscriptionRepo.recordEventUsage(usage);
    
    // Return updated subscription info
    const updatedSubscription = await subscriptionRepo.findByUserId(ctx.user.id);
    
    return {
      usage: recordedUsage,
      subscription: updatedSubscription,
    };
  });