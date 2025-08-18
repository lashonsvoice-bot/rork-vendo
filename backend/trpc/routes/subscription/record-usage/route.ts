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

    // Check if trial has expired (30 days OR 5 events, whichever comes first)
    if (subscription.status === "trialing") {
      const now = new Date();
      let trialExpired = false;
      let expiredReason = "";
      
      // Check if 30 days have passed
      if (subscription.trialEnd) {
        const trialEndDate = new Date(subscription.trialEnd);
        if (now > trialEndDate) {
          trialExpired = true;
          expiredReason = "30-day trial period has expired";
        }
      }
      
      // Check if 5 events have been used (including this one)
      if (!trialExpired && subscription.eventsUsed >= subscription.eventsLimit) {
        trialExpired = true;
        expiredReason = "5-event trial limit reached";
      }
      
      if (trialExpired) {
        // Update subscription status to expired
        await subscriptionRepo.updateSubscription(ctx.user.id, {
          status: "past_due"
        });
        throw new Error(`Free trial has expired: ${expiredReason}. Please upgrade your subscription to continue creating events.`);
      }
    }

    // Check if user has exceeded their limit for paid subscriptions
    if (subscription.status === "active" && subscription.eventsLimit !== -1 && subscription.eventsUsed >= subscription.eventsLimit) {
      throw new Error("Event limit exceeded. Please upgrade your subscription.");
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