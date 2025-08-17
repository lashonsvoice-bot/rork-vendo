import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";

export const cancelSubscriptionProcedure = protectedProcedure.mutation(async ({ ctx }) => {
  if (!ctx.user) {
    throw new Error("User not authenticated");
  }

  if (ctx.user.role !== "business_owner") {
    throw new Error("Only business owners can cancel subscriptions");
  }

  console.log("Canceling subscription for user:", ctx.user.id);

  const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
  if (!subscription) {
    throw new Error("No subscription found");
  }

  if (subscription.status === "canceled") {
    throw new Error("Subscription is already canceled");
  }

  // Cancel subscription but keep it active until the end of current period
  const updatedSubscription = await subscriptionRepo.updateSubscription(ctx.user.id, {
    status: "canceled",
  });

  return updatedSubscription;
});