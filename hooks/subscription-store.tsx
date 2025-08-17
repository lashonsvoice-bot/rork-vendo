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
      "5 events per month",
      "Basic event management",
      "Email support",
      "30-day trial period"
    ]
  },
  {
    tier: "starter",
    name: "Starter",
    eventsLimit: 10,
    monthlyPrice: 29,
    yearlyPrice: 23, // 20% discount
    features: [
      "10 events per month",
      "Advanced event management",
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
      "20 events per month",
      "Full event management suite",
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
      "Unlimited events",
      "Enterprise event management",
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
    if (!subscription) return false;
    
    // Check if trial has expired
    if (subscription.status === "trialing" && subscription.trialEnd) {
      const trialEndDate = new Date(subscription.trialEnd);
      const now = new Date();
      if (now > trialEndDate) return false;
    }

    // Check if subscription is active
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return false;
    }

    // Check event limits
    if (subscription.eventsLimit === -1) return true; // unlimited
    return subscription.eventsUsed < subscription.eventsLimit;
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
    const trialEndDate = new Date(subscription.trialEnd);
    const now = new Date();
    return now > trialEndDate;
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
    { enabled: !!authUser?.id && authUser.role === "business_owner" }
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
    remainingEvents,
    isTrialExpired,
    daysUntilTrialExpires,
    isVerified,
    upgradeSubscription,
    recordEventUsage,
    cancelSubscription,
    isUpgrading: upgradeSubscriptionMutation.isPending,
    isRecordingUsage: recordEventUsageMutation.isPending,
    isCanceling: cancelSubscriptionMutation.isPending,
    refetch: subscriptionQuery.refetch,
  }), [
    subscription,
    subscriptionPlansWithDiscount,
    currentPlan,
    isLoading,
    subscriptionQuery.isLoading,
    canCreateEvent,
    remainingEvents,
    isTrialExpired,
    daysUntilTrialExpires,
    isVerified,
    upgradeSubscription,
    recordEventUsage,
    cancelSubscription,
    upgradeSubscriptionMutation.isPending,
    recordEventUsageMutation.isPending,
    cancelSubscriptionMutation.isPending,
    subscriptionQuery.refetch,
  ]);
});