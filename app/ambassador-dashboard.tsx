/**
 * Ambassador Dashboard
 * Main dashboard for ambassadors to manage referrals and track earnings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Share,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAmbassador } from '@/hooks/ambassador-store';
import {
  DollarSign,
  Users,
  TrendingUp,
  Link,
  Copy,
  Share2,
  LogOut,
  RefreshCw,
  UserPlus,
  CheckCircle,
  Clock,
  Mail
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function AmbassadorDashboard() {
  const router = useRouter();
  const {
    ambassador,
    stats,
    referrals,
    pendingReferrals,
    convertedReferrals,
    monthlyEarnings,
    logout,
    createReferral,
    generateReferralLink,
    refreshData,
    isLoadingStats,
    isLoadingReferrals,
    isCreatingReferral,
    isGeneratingLink
  } = useAmbassador();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [referralEmail, setReferralEmail] = useState('');
  const [referralRole, setReferralRole] = useState<'business_owner' | 'host' | 'contractor'>('business_owner');
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ambassador) {
      router.replace('/ambassador-login' as any);
    }
  }, [ambassador]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/ambassador-login' as any);
          }
        }
      ]
    );
  };

  const handleGenerateLink = async (role: 'business_owner' | 'host' | 'contractor') => {
    try {
      const result = await generateReferralLink(role);
      if (result && result.success && result.referralLink) {
        setGeneratedLinks(prev => ({ ...prev, [role]: result.referralLink }));
        Alert.alert('Success', 'Referral link generated!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate link');
    }
  };

  const handleCopyLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Link copied to clipboard!');
  };

  const handleShareLink = async (link: string, role: string) => {
    try {
      await Share.share({
        message: `Join RevoVend as a ${role.replace('_', ' ')} using my referral link: ${link}`,
        title: 'RevoVend Referral'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleAddReferral = async () => {
    if (!referralEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      const result = await createReferral(referralEmail, referralRole);
      if (result.success) {
        Alert.alert('Success', 'Referral added successfully!');
        setShowAddReferral(false);
        setReferralEmail('');
        setReferralRole('business_owner');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add referral');
    }
  };

  if (!ambassador) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B4513"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{ambassador.name}</Text>
            <Text style={styles.codeText}>Code: {ambassador.referralCode}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Earnings Overview */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <DollarSign size={24} color="#8B4513" />
            <Text style={styles.earningsTitle}>Earnings Overview</Text>
          </View>
          
          <View style={styles.earningsGrid}>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Total Earned</Text>
              <Text style={styles.earningAmount}>${stats?.totalEarnings || 0}</Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Pending</Text>
              <Text style={[styles.earningAmount, styles.pendingAmount]}>
                ${stats?.pendingEarnings || 0}
              </Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>This Month</Text>
              <Text style={styles.earningAmount}>${monthlyEarnings || 0}</Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Paid Out</Text>
              <Text style={[styles.earningAmount, styles.paidAmount]}>
                ${stats?.paidEarnings || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Users size={20} color="#8B4513" />
            <Text style={styles.statNumber}>{stats?.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats?.pendingReferrals || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.statNumber}>{stats?.convertedReferrals || 0}</Text>
            <Text style={styles.statLabel}>Converted</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowAddReferral(true)}
          >
            <UserPlus size={20} color="#8B4513" />
            <Text style={styles.actionButtonText}>Add Manual Referral</Text>
          </TouchableOpacity>

          <View style={styles.linkSection}>
            <Text style={styles.linkSectionTitle}>Generate Referral Links</Text>
            
            {['business_owner', 'host', 'contractor'].map((role) => (
              <View key={role} style={styles.linkItem}>
                <View style={styles.linkHeader}>
                  <Text style={styles.linkRole}>
                    {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                  </Text>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => handleGenerateLink(role as any)}
                    disabled={isGeneratingLink}
                  >
                    {isGeneratingLink ? (
                      <ActivityIndicator size="small" color="#8B4513" />
                    ) : (
                      <Link size={16} color="#8B4513" />
                    )}
                    <Text style={styles.generateButtonText}>Generate</Text>
                  </TouchableOpacity>
                </View>
                
                {generatedLinks[role] && (
                  <View style={styles.linkActions}>
                    <Text style={styles.linkText} numberOfLines={1}>
                      {generatedLinks[role]}
                    </Text>
                    <View style={styles.linkButtons}>
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleCopyLink(generatedLinks[role])}
                      >
                        <Copy size={16} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleShareLink(generatedLinks[role], role)}
                      >
                        <Share2 size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Referrals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          
          {isLoadingReferrals ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : referrals.length === 0 ? (
            <Text style={styles.emptyText}>No referrals yet</Text>
          ) : (
            referrals.slice(0, 5).map((referral) => (
              <View key={referral.id} style={styles.referralItem}>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralEmail}>{referral.referredEmail}</Text>
                  <Text style={styles.referralRole}>
                    {referral.referredRole.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.referralStatus}>
                  <View style={[
                    styles.statusBadge,
                    referral.status === 'converted' && styles.convertedBadge,
                    referral.status === 'pending' && styles.pendingBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      referral.status === 'converted' && styles.convertedText
                    ]}>
                      {referral.status}
                    </Text>
                  </View>
                  {referral.status === 'converted' && (
                    <Text style={styles.commissionText}>
                      +${referral.commissionEarned}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Referral Modal */}
      <Modal
        visible={showAddReferral}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddReferral(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Referral</Text>
            
            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                value={referralEmail}
                onChangeText={setReferralEmail}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Role *</Text>
              <View style={styles.roleButtons}>
                {['business_owner', 'host', 'contractor'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      referralRole === role && styles.roleButtonActive
                    ]}
                    onPress={() => setReferralRole(role as any)}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      referralRole === role && styles.roleButtonTextActive
                    ]}>
                      {role.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddReferral(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, isCreatingReferral && styles.disabledButton]}
                onPress={handleAddReferral}
                disabled={isCreatingReferral}
              >
                {isCreatingReferral ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Add Referral</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  codeText: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 4,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  earningsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  earningItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  earningLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  earningAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingAmount: {
    color: '#F59E0B',
  },
  paidAmount: {
    color: '#10B981',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: -6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  linkSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  linkItem: {
    marginBottom: 16,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8B451315',
    borderRadius: 6,
  },
  generateButtonText: {
    fontSize: 12,
    color: '#8B4513',
    marginLeft: 4,
    fontWeight: '600',
  },
  linkActions: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  linkButtons: {
    flexDirection: 'row',
  },
  linkButton: {
    padding: 6,
    marginLeft: 4,
  },
  referralItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralInfo: {
    flex: 1,
  },
  referralEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  referralRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  referralStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  convertedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  convertedText: {
    color: '#065F46',
  },
  commissionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalForm: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  roleButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalSubmit: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#8B4513',
  },
  modalSubmitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});