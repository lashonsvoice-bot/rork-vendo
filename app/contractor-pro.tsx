import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { Crown, Check, X, Clock, AlertCircle } from "lucide-react-native";

export default function ContractorProScreen() {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: proStatus, isLoading, refetch } = trpc.contractor.pro.getStatus.useQuery();
  const { data: applications } = trpc.contractor.applications.getMy.useQuery();
  
  const subscribeMutation = trpc.contractor.pro.subscribe.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "You are now a Pro member!");
      setShowPaymentForm(false);
      refetch();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const cancelMutation = trpc.contractor.pro.cancel.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Your Pro subscription will be canceled at the end of the billing period");
      refetch();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSubscribe = async () => {
    // For now, we'll use a test payment method ID
    // In production, this would come from Stripe Elements or a payment form
    const testPaymentMethodId = "pm_card_visa";
    subscribeMutation.mutate({ paymentMethodId: testPaymentMethodId });
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Pro Subscription",
      "Are you sure you want to cancel your Pro subscription? You will lose access to unlimited applications and early access at the end of your billing period.",
      [
        { text: "Keep Pro", style: "cancel" },
        { text: "Cancel Subscription", style: "destructive", onPress: () => cancelMutation.mutate() },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const isPro = proStatus?.isProActive;
  const applicationsUsed = proStatus?.monthlyApplicationsUsed || 0;
  const applicationsLimit = proStatus?.monthlyApplicationsLimit || 5;
  const isUnlimited = applicationsLimit === -1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Contractor Pro</Text>
          {isPro && (
            <View style={styles.proBadge}>
              <Crown size={16} color="#FFD700" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Current Status */}
        <View style={[styles.card, isPro && styles.proCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Plan</Text>
            <Text style={[styles.planName, isPro && styles.proPlanName]}>
              {isPro ? "Pro Member" : "Free Plan"}
            </Text>
          </View>
          
          <View style={styles.usageContainer}>
            <Text style={styles.usageLabel}>Applications This Month</Text>
            <View style={styles.usageBar}>
              <View 
                style={[
                  styles.usageProgress,
                  { width: isUnlimited ? "100%" : `${(applicationsUsed / applicationsLimit) * 100}%` },
                  isPro && styles.proUsageProgress
                ]}
              />
            </View>
            <Text style={styles.usageText}>
              {isUnlimited 
                ? `${applicationsUsed} applications (Unlimited)`
                : `${applicationsUsed} / ${applicationsLimit} applications`}
            </Text>
          </View>

          {!isPro && applicationsUsed >= applicationsLimit && (
            <View style={styles.limitWarning}>
              <AlertCircle size={20} color="#FF9500" />
              <Text style={styles.limitWarningText}>
                You&apos;ve reached your monthly limit. Upgrade to Pro for unlimited applications!
              </Text>
            </View>
          )}
        </View>

        {/* Pro Benefits */}
        {!isPro && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upgrade to Pro</Text>
            <Text style={styles.price}>$9.99/month</Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefit}>
                <Check size={20} color="#34C759" />
                <Text style={styles.benefitText}>Unlimited job applications</Text>
              </View>
              <View style={styles.benefit}>
                <Check size={20} color="#34C759" />
                <Text style={styles.benefitText}>Early access to new jobs</Text>
              </View>
              <View style={styles.benefit}>
                <Check size={20} color="#34C759" />
                <Text style={styles.benefitText}>Priority in application queue</Text>
              </View>
              <View style={styles.benefit}>
                <Check size={20} color="#34C759" />
                <Text style={styles.benefitText}>Detailed analytics</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setShowPaymentForm(true)}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Applications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Applications</Text>
          
          {applications && applications.length > 0 ? (
            applications.slice(0, 5).map((app) => (
              <View key={app.id} style={styles.applicationItem}>
                <View style={styles.applicationInfo}>
                  <Text style={styles.applicationTitle}>{app.event?.title || "Event"}</Text>
                  <Text style={styles.applicationDate}>
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  app.status === "accepted" && styles.acceptedBadge,
                  app.status === "rejected" && styles.rejectedBadge,
                  app.status === "pending" && styles.pendingBadge,
                ]}>
                  {app.status === "pending" && <Clock size={14} color="#007AFF" />}
                  {app.status === "accepted" && <Check size={14} color="#34C759" />}
                  {app.status === "rejected" && <X size={14} color="#FF3B30" />}
                  <Text style={[
                    styles.statusText,
                    app.status === "accepted" && styles.acceptedText,
                    app.status === "rejected" && styles.rejectedText,
                    app.status === "pending" && styles.pendingText,
                  ]}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noApplications}>No applications yet</Text>
          )}
        </View>

        {/* Cancel Subscription */}
        {isPro && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
          >
            <Text style={styles.cancelButtonText}>
              {cancelMutation.isPending ? "Canceling..." : "Cancel Pro Subscription"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <View style={styles.paymentModal}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentTitle}>Subscribe to Contractor Pro</Text>
            <Text style={styles.paymentSubtitle}>$9.99/month</Text>
            
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => {
                  handleSubscribe();
                  setShowPaymentForm(false);
                }}
                disabled={subscribeMutation.isPending}
              >
                {subscribeMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.payButtonText}>Subscribe Now</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelPayButton}
                onPress={() => setShowPaymentForm(false)}
              >
                <Text style={styles.cancelPayButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.paymentNote}>
              Note: This is a test implementation. In production, this would use Stripe payment elements.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proBadgeText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    color: "#666",
  },
  proPlanName: {
    color: "#FFD700",
    fontWeight: "600",
  },
  usageContainer: {
    marginTop: 12,
  },
  usageLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  usageBar: {
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  usageProgress: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  proUsageProgress: {
    backgroundColor: "#FFD700",
  },
  usageText: {
    fontSize: 14,
    color: "#666",
  },
  limitWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  limitWarningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#856404",
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 16,
  },
  benefitsList: {
    marginBottom: 20,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#000",
  },
  upgradeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  applicationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  applicationInfo: {
    flex: 1,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
  },
  pendingBadge: {
    backgroundColor: "#E3F2FD",
  },
  acceptedBadge: {
    backgroundColor: "#E8F5E9",
  },
  rejectedBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  pendingText: {
    color: "#007AFF",
  },
  acceptedText: {
    color: "#34C759",
  },
  rejectedText: {
    color: "#FF3B30",
  },
  noApplications: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  cancelButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  paymentModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  paymentModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  paymentSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  paymentActions: {
    marginTop: 20,
  },
  payButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  payButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelPayButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelPayButtonText: {
    color: "#666",
    fontSize: 16,
  },
  paymentNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});