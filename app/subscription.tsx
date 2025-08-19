import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Check, Crown, Star, Zap } from "lucide-react-native";
import { useSubscription, type SubscriptionTier, type BillingCycle } from "@/hooks/subscription-store";
import { theme } from "@/constants/theme";
import VerificationBadge from "@/components/VerificationBadge";

const TIER_ICONS = {
  free: Star,
  starter: Zap,
  professional: Crown,
  enterprise: Crown,
} as const;

const TIER_COLORS = {
  free: theme.colors.gray[500],
  starter: theme.colors.blue[500],
  professional: theme.colors.purple[500],
  enterprise: theme.colors.gold[500],
} as const;

export default function SubscriptionScreen() {
  const {
    subscription,
    subscriptionPlans,
    originalPlans,
    currentPlan,
    isLoading,
    isVerified,
    upgradeSubscription,
    startStripeCheckout,
    isUpgrading,
    isStartingCheckout,
    daysUntilTrialExpires,
    isTrialExpired,
    trialExpirationReason,
    remainingEvents,
  } = useSubscription();

  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>("monthly");
  const params = useLocalSearchParams<{ status?: string }>();

  // Calculate savings from verification discount
  const getDiscountSavings = (originalPrice: number, discountedPrice: number) => {
    return originalPrice - discountedPrice;
  };

  const handleUpgrade = async (tier: Exclude<SubscriptionTier, "free">) => {
    try {
      const url = await startStripeCheckout(tier, selectedBillingCycle);
      if (url) {
        Alert.alert(
          "Continue in Browser",
          "We'll open a secure Stripe Checkout page to complete your upgrade.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open", onPress: () => {
                try {
                  // Use Linking to open hosted checkout (works in Expo Go and web)
                  const Linking = require('react-native').Linking as typeof import('react-native').Linking;
                  Linking.openURL(url);
                } catch (e) {
                  console.log('Open URL error', e);
                }
              } }
          ]
        );
      }
    } catch (error) {
      console.error("Checkout error:", error);
      Alert.alert("Error", "Failed to start checkout. Please try again.");
    }
  };

  const confirmUpgrade = (tier: Exclude<SubscriptionTier, "free">, planName: string, price: number) => {
    const billingText = selectedBillingCycle === "yearly" ? "year" : "month";
    Alert.alert(
      "Confirm Upgrade",
      `Upgrade to ${planName} for $${price}/${billingText}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade", onPress: () => handleUpgrade(tier) },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Subscription" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Subscription Plans" }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Subscription Status */}
        {subscription && (
          <View style={styles.currentSubscriptionCard}>
            <Text style={styles.currentSubscriptionTitle}>Current Plan</Text>
            <View style={styles.currentSubscriptionContent}>
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanName}>{currentPlan?.name || "Unknown"}</Text>
                <Text style={styles.currentPlanDetails}>
                  {subscription.eventsUsed} / {subscription.eventsLimit === -1 ? "∞" : subscription.eventsLimit} events used
                </Text>
                {subscription.status === "trialing" && (
                  <View style={styles.trialInfoContainer}>
                    {isTrialExpired ? (
                      <Text style={[styles.trialInfo, styles.trialExpired]}>
                        {trialExpirationReason ? `Trial expired: ${trialExpirationReason}` : "Trial expired - Upgrade to continue"}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.trialInfo}>
                          Trial: {remainingEvents} events or {daysUntilTrialExpires} days remaining
                        </Text>
                        <Text style={styles.trialSubInfo}>
                          (whichever comes first)
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggleContainer}>
          <Text style={styles.billingToggleTitle}>Billing Cycle</Text>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === "monthly" && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle("monthly")}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  selectedBillingCycle === "monthly" && styles.billingOptionTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === "yearly" && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle("yearly")}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  selectedBillingCycle === "yearly" && styles.billingOptionTextActive,
                ]}
              >
                Yearly
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>20% OFF</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {subscriptionPlans.filter(plan => plan.tier !== "free").map((plan) => {
            const IconComponent = TIER_ICONS[plan.tier];
            const iconColor = TIER_COLORS[plan.tier];
            const price = selectedBillingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const isCurrentPlan = subscription?.tier === plan.tier;

            return (
              <View
                key={plan.tier}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan,
                  isCurrentPlan && styles.currentPlanCard,
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <IconComponent size={24} color={iconColor} />
                    <Text style={styles.planName}>{plan.name}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    {selectedBillingCycle === "yearly" && isVerified ? (
                      <View style={styles.discountPriceContainer}>
                        <Text style={styles.originalPrice}>${originalPlans.find(p => p.tier === plan.tier)?.yearlyPrice}</Text>
                        <Text style={styles.price}>${price}</Text>
                        <VerificationBadge isVerified={true} size="small" />
                      </View>
                    ) : (
                      <Text style={styles.price}>${price}</Text>
                    )}
                    <Text style={styles.priceUnit}>/{selectedBillingCycle === "yearly" ? "year" : "month"}</Text>
                  </View>
                  {selectedBillingCycle === "yearly" && (
                    <View style={styles.yearlyBillingContainer}>
                      <Text style={styles.yearlyBilling}>
                        Billed annually (${(price * 12).toFixed(0)})
                      </Text>
                      {isVerified && (
                        <Text style={styles.savingsText}>
                          Save ${getDiscountSavings(
                            (originalPlans.find(p => p.tier === plan.tier)?.yearlyPrice || 0) * 12,
                            price * 12
                          ).toFixed(0)} with verification!
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color={theme.colors.green[500]} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.upgradeButton,
                    isCurrentPlan && styles.currentPlanButton,
                    plan.popular && !isCurrentPlan && styles.popularPlanButton,
                  ]}
                  onPress={() => {
                    if (!isCurrentPlan) {
                      const finalPrice = price;
                      confirmUpgrade(plan.tier as Exclude<SubscriptionTier, "free">, plan.name, finalPrice);
                    }
                  }}
                  disabled={isCurrentPlan || isUpgrading}
                >
                  {isUpgrading || isStartingCheckout ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.upgradeButtonText,
                        isCurrentPlan && styles.currentPlanButtonText,
                      ]}
                    >
                      {isCurrentPlan ? "Current Plan" : "Upgrade"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include secure payment processing and can be canceled anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  currentSubscriptionCard: {
    margin: 16,
    padding: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  currentSubscriptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  currentPlanDetails: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  trialInfo: {
    fontSize: 12,
    color: theme.colors.blue[600],
    fontWeight: "500",
  },
  trialExpired: {
    color: theme.colors.red[600],
  },
  trialInfoContainer: {
    marginTop: 4,
  },
  trialSubInfo: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  billingToggleContainer: {
    margin: 16,
    marginTop: 0,
  },
  billingToggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  billingOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text.secondary,
  },
  billingOptionTextActive: {
    color: "#fff",
  },
  discountBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.green[500],
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  plansContainer: {
    padding: 16,
    paddingTop: 0,
  },
  planCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
  },
  popularPlan: {
    borderColor: theme.colors.purple[500],
    borderWidth: 2,
  },
  currentPlanCard: {
    borderColor: theme.colors.green[500],
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    left: 20,
    backgroundColor: theme.colors.purple[500],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  planHeader: {
    marginBottom: 20,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  priceUnit: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  yearlyBilling: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  currentPlanButton: {
    backgroundColor: theme.colors.gray[200],
  },
  popularPlanButton: {
    backgroundColor: theme.colors.purple[500],
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  currentPlanButtonText: {
    color: theme.colors.text.secondary,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
  discountPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontSize: 20,
    fontWeight: "500",
    color: theme.colors.text.secondary,
    textDecorationLine: "line-through",
  },
  yearlyBillingContainer: {
    gap: 4,
  },
  savingsText: {
    fontSize: 12,
    color: theme.colors.green[600],
    fontWeight: "600",
  },
});