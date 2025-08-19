import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { subscriptionRepo } from "@/backend/db/subscription-repo";
import { userRepo } from "@/backend/db/user-repo";
import { 
  createStripeCustomer, 
  createStripeSubscription, 
  getStripePriceId,
  createSetupIntent,
  getStripeSubscription
} from "@/backend/lib/stripe";

export const createStripeCheckoutProcedure = protectedProcedure
  .input(z.object({
    tier: z.enum(["starter", "professional", "enterprise"]),
    billingCycle: z.enum(["monthly", "yearly"]),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can create subscriptions");
    }

    console.log("Creating Stripe checkout for user:", ctx.user.id, "tier:", input.tier);

    // Get user details
    const user = await userRepo.findById(ctx.user.id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a subscription
    let subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    let stripeCustomerId = subscription?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer({
        email: user.email,
        name: user.name || undefined,
        userId: ctx.user.id,
      });
      stripeCustomerId = stripeCustomer.id;
      console.log("Created Stripe customer:", stripeCustomerId);
    }

    // Get the price ID for the selected tier and billing cycle
    const priceId = getStripePriceId(input.tier, input.billingCycle);
    
    // Create Stripe subscription
    const stripeSubscription = await createStripeSubscription({
      customerId: stripeCustomerId,
      priceId,
      trialPeriodDays: subscription?.status === "trialing" ? 14 : undefined, // 14 days trial for new users
    });

    console.log("Created Stripe subscription:", stripeSubscription.id);

    // Update or create local subscription record
    const { eventsLimit, pricePerMonth } = subscriptionRepo.getSubscriptionLimits(input.tier);
    const now = new Date();
    const subscriptionData = {
      tier: input.tier,
      status: stripeSubscription.status === "trialing" ? "trialing" as const : "active" as const,
      billingCycle: input.billingCycle,
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : undefined,
      eventsLimit,
      pricePerMonth: input.billingCycle === "yearly" ? Math.floor(pricePerMonth * 0.8) : pricePerMonth,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
    };

    if (subscription) {
      subscription = await subscriptionRepo.updateSubscription(ctx.user.id, subscriptionData);
    } else {
      subscription = await subscriptionRepo.createSubscription({
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: ctx.user.id,
        eventsUsed: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...subscriptionData,
      });
    }

    // Extract client secret from the subscription's latest invoice
    const latestInvoice = stripeSubscription.latest_invoice;
    let clientSecret: string | null = null;
    
    if (latestInvoice && typeof latestInvoice === 'object' && 'payment_intent' in latestInvoice) {
      const paymentIntent = latestInvoice.payment_intent;
      if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in paymentIntent) {
        clientSecret = paymentIntent.client_secret as string;
      }
    }

    return {
      subscription,
      stripeSubscriptionId: stripeSubscription.id,
      clientSecret,
      status: stripeSubscription.status,
    };
  });

export const createSetupIntentProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    console.log("Creating setup intent for user:", ctx.user.id);

    // Get user's subscription to find Stripe customer ID
    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe customer found. Please create a subscription first.");
    }

    // Create setup intent for saving payment method
    const setupIntent = await createSetupIntent(subscription.stripeCustomerId);

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  });

export const getStripeSubscriptionStatusProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    console.log("Getting Stripe subscription status for user:", ctx.user.id);

    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    if (!subscription?.stripeSubscriptionId) {
      return { hasStripeSubscription: false, subscription };
    }

    try {
      const stripeSubscription = await getStripeSubscription(subscription.stripeSubscriptionId);
      const updatedSubscription = await subscriptionRepo.updateSubscription(ctx.user.id, {
        status: stripeSubscription.status === "active" ? "active" : 
               stripeSubscription.status === "trialing" ? "trialing" :
               stripeSubscription.status === "past_due" ? "past_due" : "canceled",
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : undefined,
      });

      return {
        hasStripeSubscription: true,
        subscription: updatedSubscription,
        stripeStatus: stripeSubscription.status,
        stripeSubscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          current_period_start: (stripeSubscription as any).current_period_start,
          current_period_end: (stripeSubscription as any).current_period_end,
          trial_end: (stripeSubscription as any).trial_end,
          cancel_at_period_end: (stripeSubscription as any).cancel_at_period_end,
        },
      };
    } catch (error) {
      console.error("Error fetching Stripe subscription:", error);
      return { hasStripeSubscription: false, subscription, error: "Failed to fetch Stripe subscription" };
    }
  });

export const linkExistingStripeSubscriptionProcedure = protectedProcedure
  .input(z.object({
    stripeSubscriptionId: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }
    if (ctx.user.role !== "business_owner") {
      throw new Error("Only business owners can link subscriptions");
    }

    console.log("Linking existing Stripe subscription for user:", ctx.user.id, input.stripeSubscriptionId);

    const stripeSubscription = await getStripeSubscription(input.stripeSubscriptionId);

    const item = stripeSubscription.items.data[0];
    const price = item?.price;
    if (!price) {
      throw new Error("Stripe subscription has no price item");
    }

    const tierMeta = (price.metadata?.tier ?? "").toString();
    const cycleMeta = (price.metadata?.cycle ?? (price.recurring?.interval ?? "")).toString();

    const tier = tierMeta === "starter" || tierMeta === "professional" || tierMeta === "enterprise" ? tierMeta : "starter";
    const billingCycle = cycleMeta === "yearly" || cycleMeta === "year" ? "yearly" as const : "monthly" as const;

    const limits = subscriptionRepo.getSubscriptionLimits(tier as any);
    const now = new Date();

    const existing = await subscriptionRepo.findByUserId(ctx.user.id);
    const updated = existing
      ? await subscriptionRepo.updateSubscription(ctx.user.id, {
          tier: tier as any,
          status: stripeSubscription.status === "active" ? "active" : 
                  stripeSubscription.status === "trialing" ? "trialing" :
                  stripeSubscription.status === "past_due" ? "past_due" : "canceled",
          billingCycle,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : undefined,
          eventsLimit: limits.eventsLimit,
          pricePerMonth: billingCycle === "yearly" ? Math.floor(limits.pricePerMonth * 0.8) : limits.pricePerMonth,
          stripeCustomerId: (stripeSubscription.customer as any)?.id ?? undefined,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: price.id,
        })
      : await subscriptionRepo.createSubscription({
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: ctx.user.id,
          tier: tier as any,
          status: stripeSubscription.status === "active" ? "active" : 
                  stripeSubscription.status === "trialing" ? "trialing" :
                  stripeSubscription.status === "past_due" ? "past_due" : "canceled",
          billingCycle,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : undefined,
          eventsUsed: 0,
          eventsLimit: limits.eventsLimit,
          pricePerMonth: billingCycle === "yearly" ? Math.floor(limits.pricePerMonth * 0.8) : limits.pricePerMonth,
          stripeCustomerId: (stripeSubscription.customer as any)?.id ?? undefined,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: price.id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });

    return { subscription: updated, stripeStatus: stripeSubscription.status };
  });

// Admin procedure to create Stripe products (run once during setup)
export const createStripeProductsProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new Error("Only admins can create Stripe products");
    }

    console.log("Creating Stripe products for Revovend...");

    try {
      const { createRevovendProducts } = await import("@/backend/lib/stripe");
      const priceIds = await createRevovendProducts();
      
      return {
        success: true,
        priceIds,
        message: "Stripe products created successfully! Add the price IDs to your .env file.",
      };
    } catch (error) {
      console.error("Error creating Stripe products:", error);
      throw new Error(`Failed to create Stripe products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });