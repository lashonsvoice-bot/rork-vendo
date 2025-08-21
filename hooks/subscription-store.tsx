import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/auth-store";
import { trpc } from "@/lib/trpc";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  eventsUsed: number;
  eventsLimit: number;
  pricePerMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  eventsLimit: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "free",
    name: "Free Trial",
    eventsLimit: 5,
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 events OR 30 days (whichever comes first)",
      "Events only count when contractors are hired & checked in",
      "Basic event management",
      "Email support",
      "No credit card required",
      "Proposals & hiring disabled (upgrade to unlock)"
    ]
  },
  {
    tier: "starter",
    name: "Starter",
    eventsLimit: 10,
    monthlyPrice: 29,
    yearlyPrice: 23, // 20% discount
    features: [
      "10 events per month (only count when contractors hired & checked in)",
      "Advanced event management",
      "Send proposals to hosts",
      "Hire contractors",
      "Priority email support",
      "Basic analytics",
      "Custom branding"
    ]
  },
  {
    tier: "professional",
    name: "Professional",
    eventsLimit: 20,
    monthlyPrice: 59,
    yearlyPrice: 47, // 20% discount
    popular: true,
    features: [
      "20 events per month (only count when contractors hired & checked in)",
      "Full event management suite",
      "Send proposals to hosts",
      "Hire contractors",
      "Phone & email support",
      "Advanced analytics",
      "Custom branding",
      "API access",
      "Team collaboration"
    ]
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    eventsLimit: -1, // unlimited
    monthlyPrice: 99,
    yearlyPrice: 79, // 20% discount
    features: [
      "Unlimited events (only count when contractors hired & checked in)",
      "Enterprise event management",
      "Send proposals to hosts",
      "Hire contractors",
      "24/7 priority support",
      "Advanced analytics & reporting",
      "White-label solution",
      "API access",
      "Team collaboration",
      "Custom integrations",
      "Dedicated account manager"
    ]
  }
];

const SUBSCRIPTION_STORAGE_KEY = "subscription_data";

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: authUser } = useAuth();

  const subscriptionQuery = trpc.subscription.get.useQuery(undefined, {
    enabled: !!authUser && authUser.role === "business_owner",
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log('[Subscription] Query retry:', failureCount, error?.message);
      if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    }
  });

  const upgradeSubscriptionMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSubscription(data);
        saveSubscriptionData(data);
      }
      subscriptionQuery.refetch();
    },
  });

  const createCheckoutMutation = trpc.subscription.stripe.createCheckout.useMutation();

  const linkByEmailMutation = trpc.subscription.stripe.linkByEmail.useMutation({
    onSuccess: (res) => {
      if (res?.subscription) {
        setSubscription(res.subscription as unknown as Subscription);
        saveSubscriptionData(res.subscription as unknown as Subscription);
      }
      subscriptionQuery.refetch();
    },
  });

  const linkExistingMutation = trpc.subscription.stripe.linkExisting.useMutation({
    onSuccess: (res) => {
      if (res?.subscription) {
        setSubscription(res.subscription as unknown as Subscription);
        saveSubscriptionData(res.subscription as unknown as Subscription);
      }
      subscriptionQuery.refetch();
    },
  });

  const createBillingPortalMutation = trpc.subscription.stripe.createBillingPortalSession.useMutation();

  const recordEventUsageMutation = trpc.subscription.recordUsage.useMutation({
    onSuccess: (data) => {
      if (data?.subscription) {
        setSubscription(data.subscription);
        saveSubscriptionData(data.subscription);
      }
      subscriptionQuery.refetch();
    },
  });

  const cancelSubscriptionMutation = trpc.subscription.cancel.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSubscription(data);
        saveSubscriptionData(data);
      }
      subscriptionQuery.refetch();
    },
  });

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  useEffect(() => {
    if (subscriptionQuery.data) {
      setSubscription(subscriptionQuery.data);
      saveSubscriptionData(subscriptionQuery.data);
    }
    setIsLoading(subscriptionQuery.isLoading);
  }, [subscriptionQuery.data, subscriptionQuery.isLoading]);

  const loadSubscriptionData = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubscription(parsed);
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
    }
  };

  const saveSubscriptionData = async (subscriptionData: Subscription) => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscriptionData));
    } catch (error) {
      console.error("Error saving subscription data:", error);
    }
  };

  const upgradeSubscription = useCallback(async (tier: Exclude<SubscriptionTier, "free">, billingCycle: BillingCycle) => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can upgrade subscriptions");
    }

    return upgradeSubscriptionMutation.mutateAsync({ tier, billingCycle });
  }, [authUser, upgradeSubscriptionMutation]);

  const startStripeCheckout = useCallback(async (tier: Exclude<SubscriptionTier, "free">, billingCycle: BillingCycle) => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can start checkout");
    }
    const res = await createCheckoutMutation.mutateAsync({ tier, billingCycle });
    return res?.url as string;
  }, [authUser, createCheckoutMutation]);

  const linkStripeByEmail = useCallback(async (email: string) => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can link subscriptions");
    }
    console.log('[Subscription] Linking Stripe by email:', email);
    const res = await linkByEmailMutation.mutateAsync({ email });
    return res;
  }, [authUser, linkByEmailMutation]);

  const linkStripeBySubscriptionId = useCallback(async (stripeSubscriptionId: string) => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can link subscriptions");
    }
    console.log('[Subscription] Linking Stripe by subscription ID:', stripeSubscriptionId);
    const res = await linkExistingMutation.mutateAsync({ stripeSubscriptionId });
    return res;
  }, [authUser, linkExistingMutation]);

  const createBillingPortal = useCallback(async () => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can open billing portal");
    }
    console.log('[Subscription] Creating billing portal session');
    const res = await createBillingPortalMutation.mutateAsync();
    return res;
  }, [authUser, createBillingPortalMutation]);

  const recordEventUsage = useCallback(async (eventId: string, eventDate: string) => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can record event usage");
    }

    return recordEventUsageMutation.mutateAsync({ eventId, eventDate });
  }, [authUser, recordEventUsageMutation]);

  const cancelSubscription = useCallback(async () => {
    if (!authUser || authUser.role !== "business_owner") {
      throw new Error("Only business owners can cancel subscriptions");
    }

    return cancelSubscriptionMutation.mutateAsync();
  }, [authUser, cancelSubscriptionMutation]);

  const canCreateEvent = useMemo(() => {
    if (!subscription) return true; // Allow creation, counting happens later
    
    // Check if trial has expired (30 days OR 5 events, whichever comes first)
    if (subscription.status === "trialing") {
      const now = new Date();
      
      // Check if 30 days have passed
      if (subscription.trialEnd) {
        const trialEndDate = new Date(subscription.trialEnd);
        if (now > trialEndDate) return false;
      }
      
      // Check if 5 events have been used (events only count when contractors are hired and checked in)
      if (subscription.eventsUsed >= subscription.eventsLimit) {
        return false;
      }
    }

    // Check if subscription is active
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return false;
    }

    // Check event limits for paid subscriptions
    if (subscription.status === "active") {
      if (subscription.eventsLimit === -1) return true; // unlimited
      return subscription.eventsUsed < subscription.eventsLimit;
    }
    
    return true;
  }, [subscription]);

  const canSendProposals = useMemo(() => {
    if (!subscription) return false;
    
    // Proposals are disabled during free trial - only available for paid subscriptions
    if (subscription.status === "trialing") {
      return false;
    }

    // Check if subscription is active
    return subscription.status === "active";
  }, [subscription]);

  const canHireContractors = useMemo(() => {
    if (!subscription) return false;
    
    // Hiring is disabled during free trial - only available for paid subscriptions
    if (subscription.status === "trialing") {
      return false;
    }

    // Check if subscription is active
    return subscription.status === "active";
  }, [subscription]);

  const remainingEvents = useMemo(() => {
    if (!subscription) return 0;
    if (subscription.eventsLimit === -1) return -1; // unlimited
    return Math.max(0, subscription.eventsLimit - subscription.eventsUsed);
  }, [subscription]);

  const isTrialExpired = useMemo(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.trialEnd) {
      return false;
    }
    const now = new Date();
    const trialEndDate = new Date(subscription.trialEnd);
    
    // Trial expires if either 30 days have passed OR 5 events have been used
    const timeExpired = now > trialEndDate;
    const eventsExpired = subscription.eventsUsed >= subscription.eventsLimit;
    
    return timeExpired || eventsExpired;
  }, [subscription]);

  const trialExpirationReason = useMemo(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.trialEnd) {
      return null;
    }
    const now = new Date();
    const trialEndDate = new Date(subscription.trialEnd);
    
    const timeExpired = now > trialEndDate;
    const eventsExpired = subscription.eventsUsed >= subscription.eventsLimit;
    
    if (timeExpired && eventsExpired) {
      return "Both 30-day period and 5-event limit reached";
    } else if (timeExpired) {
      return "30-day trial period expired";
    } else if (eventsExpired) {
      return "5-event trial limit reached";
    }
    
    return null;
  }, [subscription]);

  const daysUntilTrialExpires = useMemo(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.trialEnd) {
      return null;
    }
    const trialEndDate = new Date(subscription.trialEnd);
    const now = new Date();
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [subscription]);

  const currentPlan = useMemo(() => {
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(plan => plan.tier === subscription.tier) || null;
  }, [subscription]);

  // Get profile to check verification status
  const profileQuery = trpc.profile.get.useQuery(
    { userId: authUser?.id },
    { 
      enabled: !!authUser?.id && authUser.role === "business_owner",
      retry: (failureCount, error) => {
        console.log('[Subscription] Profile query retry:', failureCount, error?.message);
        if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
          return failureCount < 1;
        }
        return failureCount < 2;
      }
    }
  );

  const isVerified = useMemo(() => {
    if (!profileQuery.data || profileQuery.data.role !== 'business_owner') return false;
    return profileQuery.data.isVerified || false;
  }, [profileQuery.data]);

  const getDiscountedPrice = useCallback((originalPrice: number) => {
    if (isVerified) {
      return Math.round(originalPrice * 0.95); // 5% discount
    }
    return originalPrice;
  }, [isVerified]);

  const subscriptionPlansWithDiscount = useMemo(() => {
    return SUBSCRIPTION_PLANS.map(plan => ({
      ...plan,
      monthlyPrice: getDiscountedPrice(plan.monthlyPrice),
      yearlyPrice: getDiscountedPrice(plan.yearlyPrice),
    }));
  }, [getDiscountedPrice]);

  return useMemo(() => ({
    subscription,
    subscriptionPlans: subscriptionPlansWithDiscount,
    originalPlans: SUBSCRIPTION_PLANS,
    currentPlan,
    isLoading: isLoading || subscriptionQuery.isLoading,
    canCreateEvent,
    canSendProposals,
    canHireContractors,
    remainingEvents,
    isTrialExpired,
    trialExpirationReason,
    daysUntilTrialExpires,
    isVerified,
    upgradeSubscription,
    startStripeCheckout,
    recordEventUsage,
    cancelSubscription,
    linkStripeByEmail,
    linkStripeBySubscriptionId,
    createBillingPortal,
    isUpgrading: upgradeSubscriptionMutation.isPending,
    isStartingCheckout: createCheckoutMutation.isPending,
    isRecordingUsage: recordEventUsageMutation.isPending,
    isCanceling: cancelSubscriptionMutation.isPending,
    isLinking: linkByEmailMutation.isPending || linkExistingMutation.isPending,
    isCreatingPortal: createBillingPortalMutation.isPending,
    refetch: subscriptionQuery.refetch,
  }), [
    subscription,
    subscriptionPlansWithDiscount,
    currentPlan,
    isLoading,
    subscriptionQuery.isLoading,
    canCreateEvent,
    canSendProposals,
    canHireContractors,
    remainingEvents,
    isTrialExpired,
    trialExpirationReason,
    daysUntilTrialExpires,
    isVerified,
    upgradeSubscription,
    startStripeCheckout,
    recordEventUsage,
    cancelSubscription,
    linkStripeByEmail,
    linkStripeBySubscriptionId,
    createBillingPortal,
    upgradeSubscriptionMutation.isPending,
    createCheckoutMutation.isPending,
    recordEventUsageMutation.isPending,
    cancelSubscriptionMutation.isPending,
    linkByEmailMutation.isPending,
    linkExistingMutation.isPending,
    createBillingPortalMutation.isPending,
    subscriptionQuery.refetch,
  ]);
});