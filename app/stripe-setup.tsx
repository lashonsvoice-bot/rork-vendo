import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Settings, CheckCircle, AlertCircle } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { theme } from "@/constants/theme";

export default function StripeSetupScreen() {
  const [isCreating, setIsCreating] = useState(false);
  const [priceIds, setPriceIds] = useState<{
    starter: { monthly: string; yearly: string };
    professional: { monthly: string; yearly: string };
    enterprise: { monthly: string; yearly: string };
  } | null>(null);

  const createProductsMutation = trpc.subscription.stripe.createProducts.useMutation({
    onSuccess: (data) => {
      setPriceIds(data.priceIds);
      Alert.alert(
        "Success!",
        "Stripe products created successfully! Copy the price IDs below and update your .env file.",
        [{ text: "OK" }]
      );
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        `Failed to create Stripe products: ${error.message}`,
        [{ text: "OK" }]
      );
    },
  });

  const handleCreateProducts = async () => {
    try {
      setIsCreating(true);
      await createProductsMutation.mutateAsync();
    } catch (error) {
      console.error("Error creating products:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Stripe Setup" }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Settings size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Stripe Products Setup</Text>
          <Text style={styles.subtitle}>
            Create subscription products in your Stripe account to enable plan upgrades.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <AlertCircle size={20} color={theme.colors.orange[500]} />
            <Text style={styles.statusText}>
              Stripe products need to be created. The current price IDs in your .env file are invalid.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What this will do:</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Create Starter Plan ($29/month, $276/year)</Text>
            <Text style={styles.featureItem}>• Create Professional Plan ($59/month, $564/year)</Text>
            <Text style={styles.featureItem}>• Create Enterprise Plan ($99/month, $948/year)</Text>
            <Text style={styles.featureItem}>• Generate proper Stripe price IDs</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateProducts}
          disabled={isCreating || createProductsMutation.isPending}
        >
          {isCreating || createProductsMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Stripe Products</Text>
          )}
        </TouchableOpacity>

        {priceIds && (
          <View style={styles.section}>
            <View style={styles.successHeader}>
              <CheckCircle size={20} color={theme.colors.green[500]} />
              <Text style={styles.successTitle}>Products Created Successfully!</Text>
            </View>
            
            <Text style={styles.instructionText}>
              Copy these price IDs and update your .env file:
            </Text>
            
            <View style={styles.priceIdContainer}>
              <Text style={styles.priceIdText}>STRIPE_STARTER_MONTHLY_PRICE_ID={priceIds.starter.monthly}</Text>
              <Text style={styles.priceIdText}>STRIPE_STARTER_YEARLY_PRICE_ID={priceIds.starter.yearly}</Text>
              <Text style={styles.priceIdText}>STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID={priceIds.professional.monthly}</Text>
              <Text style={styles.priceIdText}>STRIPE_PROFESSIONAL_YEARLY_PRICE_ID={priceIds.professional.yearly}</Text>
              <Text style={styles.priceIdText}>STRIPE_ENTERPRISE_MONTHLY_PRICE_ID={priceIds.enterprise.monthly}</Text>
              <Text style={styles.priceIdText}>STRIPE_ENTERPRISE_YEARLY_PRICE_ID={priceIds.enterprise.yearly}</Text>
            </View>
            
            <Text style={styles.warningText}>
              ⚠️ After updating your .env file, restart your development server for the changes to take effect.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Note: This requires admin privileges and a valid Stripe secret key in your environment.
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.orange[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.orange[200],
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.orange[700],
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  featureList: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featureItem: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 8,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.gray[400],
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.green[600],
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    fontWeight: "500",
  },
  priceIdContainer: {
    backgroundColor: theme.colors.gray[100],
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceIdText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.orange[600],
    fontWeight: "500",
    textAlign: "center",
    backgroundColor: theme.colors.orange[50],
    padding: 12,
    borderRadius: 8,
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
});