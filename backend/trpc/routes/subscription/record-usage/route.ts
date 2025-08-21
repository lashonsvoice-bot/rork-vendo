import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";
import { eventRepo } from "@/backend/db/event-repo";

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

    // Get the event to check if it qualifies for counting
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only count events that have contractors hired AND at least one contractor checked in by host
    const hasHiredContractors = event.status === 'contractors_hired' || (event.selectedContractors?.length ?? 0) > 0;
    const hasCheckedInContractors = event.vendors?.some(vendor => 
      vendor.contractorId && vendor.arrivalConfirmed
    );

    if (!hasHiredContractors) {
      console.log("Event does not count - no contractors hired yet:", input.eventId);
      return {
        usage: null,
        subscription: await subscriptionRepo.findByUserId(ctx.user.id),
        message: "Event does not count toward limit - no contractors hired yet"
      };
    }

    if (!hasCheckedInContractors) {
      console.log("Event does not count - no contractors checked in by host yet:", input.eventId);
      return {
        usage: null,
        subscription: await subscriptionRepo.findByUserId(ctx.user.id),
        message: "Event does not count toward limit - no contractors checked in by host yet"
      };
    }

    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    if (!subscription) {
      throw new Error("No subscription found");
    }

    // Check if this event has already been counted
    const existingUsage = await subscriptionRepo.getUsageForEvent(ctx.user.id, input.eventId);
    if (existingUsage) {
      console.log("Event already counted:", input.eventId);
      return {
        usage: existingUsage,
        subscription,
        message: "Event already counted"
      };
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
    
    console.log("Event successfully counted toward subscription:", input.eventId);
    
    return {
      usage: recordedUsage,
      subscription: updatedSubscription,
      message: "Event counted toward subscription limit"
    };
  });

export const checkAndRecordEventUsageProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    console.log("Checking if event should be counted:", input.eventId, "by user:", ctx.user.id);

    // Get the event to check if it qualifies for counting
    const event = await eventRepo.findById(input.eventId);
    if (!event) {
      console.log("Event not found:", input.eventId);
      return { counted: false, reason: "Event not found" };
    }

    // Only count for business owner events
    if (!event.businessOwnerId) {
      console.log("Event has no business owner:", input.eventId);
      return { counted: false, reason: "Event has no business owner" };
    }

    // Only count events that have contractors hired AND at least one contractor checked in by host
    const hasHiredContractors = event.status === 'contractors_hired' || (event.selectedContractors?.length ?? 0) > 0;
    const hasCheckedInContractors = event.vendors?.some(vendor => 
      vendor.contractorId && vendor.arrivalConfirmed
    );

    if (!hasHiredContractors) {
      console.log("Event does not count - no contractors hired yet:", input.eventId);
      return { counted: false, reason: "No contractors hired yet" };
    }

    if (!hasCheckedInContractors) {
      console.log("Event does not count - no contractors checked in by host yet:", input.eventId);
      return { counted: false, reason: "No contractors checked in by host yet" };
    }

    // Check if this event has already been counted
    const existingUsage = await subscriptionRepo.getUsageForEvent(event.businessOwnerId, input.eventId);
    if (existingUsage) {
      console.log("Event already counted:", input.eventId);
      return { counted: true, reason: "Already counted", usage: existingUsage };
    }

    // Get business owner's subscription
    const subscription = await subscriptionRepo.findByUserId(event.businessOwnerId);
    if (!subscription) {
      console.log("No subscription found for business owner:", event.businessOwnerId);
      return { counted: false, reason: "No subscription found" };
    }

    // Record the usage
    const usage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      userId: event.businessOwnerId,
      eventId: input.eventId,
      eventDate: event.date,
      createdAt: new Date().toISOString(),
    };

    const recordedUsage = await subscriptionRepo.recordEventUsage(usage);
    
    console.log("Event successfully counted toward subscription:", input.eventId, "for business owner:", event.businessOwnerId);
    
    return {
      counted: true,
      reason: "Event counted toward subscription limit",
      usage: recordedUsage
    };
  });