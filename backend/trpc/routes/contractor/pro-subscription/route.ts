import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { subscriptionRepo } from "../../../../db/subscription-repo";
import { contractorApplicationsRepo } from "../../../../db/contractor-applications-repo";
import { stripe } from "../../../../lib/stripe";
import { TRPCError } from "@trpc/server";

// Get contractor pro subscription status
export const getContractorProStatus = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    const monthlyUsage = await contractorApplicationsRepo.getMonthlyUsage(ctx.user.id);
    
    const isProActive = subscription?.tier === "contractor_pro" && 
                       subscription?.status === "active";
    
    const limits = subscriptionRepo.getSubscriptionLimits(
      subscription?.tier || "free"
    );
    
    return {
      isProActive,
      tier: subscription?.tier || "free",
      monthlyApplicationsUsed: monthlyUsage,
      monthlyApplicationsLimit: limits.contractorApplicationsLimit || 5,
      earlyAccessEnabled: limits.earlyAccessEnabled || false,
      subscription
    };
  });

// Subscribe to contractor pro
export const subscribeToContractorPro = protectedProcedure
  .input(z.object({
    paymentMethodId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    if (ctx.user.role !== "contractor") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only contractors can subscribe to Contractor Pro"
      });
    }
    
    const existingSubscription = await subscriptionRepo.findByUserId(ctx.user.id);
    
    if (existingSubscription?.tier === "contractor_pro" && 
        existingSubscription?.status === "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Already subscribed to Contractor Pro"
      });
    }
    
    try {
      // Create or get Stripe customer
      let stripeCustomerId = existingSubscription?.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          metadata: {
            userId: ctx.user.id,
            role: ctx.user.role
          }
        });
        stripeCustomerId = customer.id;
      }
      
      // Attach payment method to customer
      await stripe.paymentMethods.attach(input.paymentMethodId, {
        customer: stripeCustomerId
      });
      
      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: input.paymentMethodId
        }
      });
      
      // Create subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price: process.env.STRIPE_CONTRACTOR_PRO_PRICE_ID || "price_contractor_pro"
        }],
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription"
        },
        expand: ["latest_invoice.payment_intent"]
      }) as any;
      
      const limits = subscriptionRepo.getSubscriptionLimits("contractor_pro");
      
      // Create or update subscription in database
      const subscription = existingSubscription
        ? await subscriptionRepo.updateSubscription(ctx.user.id, {
            tier: "contractor_pro",
            status: "active",
            stripeCustomerId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: process.env.STRIPE_CONTRACTOR_PRO_PRICE_ID,
            stripePaymentMethodId: input.paymentMethodId,
            pricePerMonth: limits.pricePerMonth,
            contractorApplicationsLimit: limits.contractorApplicationsLimit,
            earlyAccessEnabled: limits.earlyAccessEnabled,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
          })
        : await subscriptionRepo.createSubscription({
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: ctx.user.id,
            tier: "contractor_pro",
            status: "active",
            billingCycle: "monthly",
            stripeCustomerId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: process.env.STRIPE_CONTRACTOR_PRO_PRICE_ID,
            stripePaymentMethodId: input.paymentMethodId,
            pricePerMonth: limits.pricePerMonth,
            contractorApplicationsUsed: 0,
            contractorApplicationsLimit: limits.contractorApplicationsLimit,
            earlyAccessEnabled: limits.earlyAccessEnabled,
            eventsUsed: 0,
            eventsLimit: 0,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
      
      return {
        success: true,
        subscription,
        stripeSubscriptionId: stripeSubscription.id
      };
    } catch (error) {
      console.error("Error creating contractor pro subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create subscription"
      });
    }
  });

// Cancel contractor pro subscription
export const cancelContractorPro = protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }
    
    const subscription = await subscriptionRepo.findByUserId(ctx.user.id);
    
    if (!subscription || subscription.tier !== "contractor_pro") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Contractor Pro subscription found"
      });
    }
    
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } catch (error) {
        console.error("Error canceling Stripe subscription:", error);
      }
    }
    
    await subscriptionRepo.updateSubscription(ctx.user.id, {
      status: "canceled"
    });
    
    return { success: true };
  });