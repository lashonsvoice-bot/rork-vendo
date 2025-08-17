import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Share2, 
  Copy, 
  Gift, 
  Users, 
  DollarSign, 
  Clock,
  Plus,
  ExternalLink,
} from 'lucide-react-native';
import { useReferral, ReferralProvider } from '@/hooks/referral-store';
import { theme } from '@/constants/theme';

function ReferralScreenContent() {
  const {
    stats,
    referralCodes,
    referralUsages,
    createReferralCode,
    shareReferralCode,
    copyReferralCode,
    copyReferralLink,
    applyReferralCode,
    isLoading,
    isCreatingCode,
    isUsingCode,
  } = useReferral();

  const [showUseCode, setShowUseCode] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');

  const handleCreateCode = async () => {
    try {
      await createReferralCode();
      Alert.alert('Success', 'Your referral code has been created!');
    } catch {
      Alert.alert('Error', 'Failed to create referral code. Please try again.');
    }
  };

  const handleUseCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    try {
      await applyReferralCode(inputCode.trim().toUpperCase());
      Alert.alert('Success', 'Referral code applied successfully!');
      setInputCode('');
      setShowUseCode(false);
    } catch {
      Alert.alert('Error', 'Invalid referral code or already used');
    }
  };

  const handleShare = async (code: any) => {
    try {
      await shareReferralCode(code);
    } catch {
      Alert.alert('Error', 'Failed to share referral code');
    }
  };

  const handleCopyCode = async (code: any) => {
    try {
      await copyReferralCode(code);
    } catch {
      Alert.alert('Error', 'Failed to copy referral code');
    }
  };

  const handleCopyLink = async (code: any) => {
    try {
      await copyReferralLink(code);
    } catch {
      Alert.alert('Error', 'Failed to copy referral link');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Referral Program',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Referral Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={24} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{stats.totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            
            <View style={styles.statCard}>
              <Gift size={24} color={theme.colors.green[500]} />
              <Text style={styles.statNumber}>{stats.successfulReferrals}</Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            
            <View style={styles.statCard}>
              <DollarSign size={24} color={theme.colors.green[500]} />
              <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            
            <View style={styles.statCard}>
              <Clock size={24} color={theme.colors.gold[500]} />
              <Text style={styles.statNumber}>${stats.pendingEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Referral Codes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Referral Codes</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateCode}
              disabled={isCreatingCode}
            >
              {isCreatingCode ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {referralCodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Gift size={48} color={theme.colors.text.secondary} />
              <Text style={styles.emptyStateText}>No referral codes yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first referral code to start earning rewards
              </Text>
            </View>
          ) : (
            referralCodes.map((code) => (
              <View key={code.id} style={styles.codeCard}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeText}>{code.code}</Text>
                  <View style={styles.codeStats}>
                    <Text style={styles.codeUsage}>{code.usageCount} uses</Text>
                    {code.maxUses && (
                      <Text style={styles.codeLimit}>/ {code.maxUses}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShare(code)}
                  >
                    <Share2 size={16} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCopyCode(code)}
                  >
                    <Copy size={16} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Copy Code</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCopyLink(code)}
                  >
                    <ExternalLink size={16} color={theme.colors.primary} />
                    <Text style={styles.actionButtonText}>Copy Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Use Referral Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Have a Referral Code?</Text>
          
          {!showUseCode ? (
            <TouchableOpacity
              style={styles.useCodeButton}
              onPress={() => setShowUseCode(true)}
            >
              <Text style={styles.useCodeButtonText}>Enter Referral Code</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.useCodeForm}>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter referral code"
                value={inputCode}
                onChangeText={setInputCode}
                autoCapitalize="characters"
                maxLength={10}
              />
              <View style={styles.useCodeActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUseCode(false);
                    setInputCode('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleUseCode}
                  disabled={isUsingCode || !inputCode.trim()}
                >
                  {isUsingCode ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Apply Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        {referralUsages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            
            {referralUsages.slice(0, 5).map((usage) => (
              <View key={usage.id} style={styles.activityCard}>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>
                    {usage.refereeType.replace('_', ' ')} signup
                  </Text>
                  <Text style={styles.activityDate}>
                    {new Date(usage.signupDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.activityReward}>
                  {usage.subscriptionDate ? (
                    <Text style={styles.rewardAmount}>
                      +${usage.rewardAmount.toFixed(2)}
                    </Text>
                  ) : (
                    <Text style={styles.pendingReward}>Pending</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.howItWorksCard}>
            <Text style={styles.howItWorksText}>
              1. Create and share your referral code{'\n'}
              2. Friends sign up using your code{'\n'}
              3. Earn 10% of their subscription (up to $50){'\n'}
              4. Get paid when they subscribe
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ReferralScreen() {
  return (
    <ReferralProvider>
      <ReferralScreenContent />
    </ReferralProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  codeCard: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: 'monospace',
  },
  codeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeUsage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  codeLimit: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  useCodeButton: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  useCodeButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  useCodeForm: {
    backgroundColor: theme.colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeInput: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  useCodeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: '500',
  },
  activityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textTransform: 'capitalize',
  },
  activityDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  activityReward: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.green[500],
  },
  pendingReward: {
    fontSize: 14,
    color: theme.colors.gold[500],
  },
  howItWorksCard: {
    backgroundColor: theme.colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  howItWorksText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
});