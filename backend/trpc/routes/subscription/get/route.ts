import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";

export const getSubscriptionProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners have subscriptions");
    }

    console.log("Getting subscription for user:", ctx.user.id);

    let subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    
    // Create free trial if no subscription exists
    if (!subscription) {
      console.log("Creating free trial subscription for user:", ctx.user.id);
      subscription = subscriptionRepo.createFreeTrialSubscription(ctx.user.id);
      await subscriptionRepo.createSubscription(subscription);
      console.log("Free trial created with 0/5 events used:", subscription.id);
    }

    return subscription;
  });