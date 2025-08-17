import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";

export const getSubscriptionProcedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.user) {
    throw new Error("User not authenticated");
  }
  
  console.log("Getting subscription for user:", ctx.user.id);
  
  let subscription = await subscriptionRepo.findByUserId(ctx.user.id);
  
  // If no subscription exists and user is business owner, create free trial
  if (!subscription && ctx.user.role === "business_owner") {
    const freeTrialSub = subscriptionRepo.createFreeTrialSubscription(ctx.user.id);
    subscription = await subscriptionRepo.createSubscription(freeTrialSub);
    console.log("Created free trial subscription:", subscription.id);
  }
  
  return subscription;
});