import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  AlertTriangle, 
  Clock, 
  FileText,
  Send,
  Calendar,
  Star,
  DollarSign,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

export default function CancellationManagementScreen() {
  const [appealReason, setAppealReason] = useState<string>('');
  const [selectedCancellationId, setSelectedCancellationId] = useState<string | null>(null);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState<boolean>(false);

  const statsQuery = trpc.events.cancellation.getStats.useQuery();
  const submitAppealMutation = trpc.events.cancellation.submitAppeal.useMutation();

  const handleSubmitAppeal = async (cancellationId: string) => {
    if (!appealReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal');
      return;
    }

    if (appealReason.trim().length < 20) {
      Alert.alert('Error', 'Appeal reason must be at least 20 characters');
      return;
    }

    setIsSubmittingAppeal(true);
    
    try {
      await submitAppealMutation.mutateAsync({
        cancellationId,
        appealReason: appealReason.trim(),
      });

      Alert.alert('Appeal Submitted', 'Your appeal has been submitted successfully. You will receive a response within 5-7 business days.');
      setAppealReason('');
      setSelectedCancellationId(null);
      statsQuery.refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit appeal');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const renderCancellationCard = (cancellation: any) => {
    const hoursNotice = cancellation.hoursNotice;
    const isLessThan24Hours = hoursNotice < 24;
    
    return (
      <View key={cancellation.id} style={styles.cancellationCard}>
        <View style={styles.cancellationHeader}>
          <Text style={styles.cancellationDate}>
            {new Date(cancellation.cancellationTime).toLocaleDateString()}
          </Text>
          <View style={[styles.statusBadge, 
            cancellation.status === 'appealed' && styles.appealedBadge,
            cancellation.status === 'processed' && styles.processedBadge
          ]}>
            <Text style={styles.statusText}>{cancellation.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.cancellationReason} numberOfLines={2}>
          {cancellation.reason}
        </Text>
        
        <View style={styles.cancellationDetails}>
          <View style={styles.detailItem}>
            <Clock size={16} color={theme.colors.text.secondary} />
            <Text style={styles.detailText}>
              {hoursNotice}h notice {isLessThan24Hours && '(< 24h)'}
            </Text>
          </View>
          
          {cancellation.automaticRating && (
            <View style={styles.detailItem}>
              <Star size={16} color={theme.colors.error} />
              <Text style={styles.penaltyText}>
                {cancellation.automaticRating}★ rating
              </Text>
            </View>
          )}
          
          {cancellation.compensationAmount && (
            <View style={styles.detailItem}>
              <DollarSign size={16} color={theme.colors.error} />
              <Text style={styles.penaltyText}>
                ${cancellation.compensationAmount.toFixed(2)} penalty
              </Text>
            </View>
          )}
        </View>
        
        {cancellation.status === 'pending' && (
          <TouchableOpacity
            style={styles.appealButton}
            onPress={() => setSelectedCancellationId(cancellation.id)}
          >
            <FileText size={16} color={theme.colors.primary} />
            <Text style={styles.appealButtonText}>Submit Appeal</Text>
          </TouchableOpacity>
        )}
        
        {cancellation.status === 'appealed' && cancellation.appealReason && (
          <View style={styles.appealInfo}>
            <Text style={styles.appealLabel}>Appeal Submitted:</Text>
            <Text style={styles.appealText}>{cancellation.appealReason}</Text>
            <Text style={styles.appealDate}>
              {new Date(cancellation.appealSubmittedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (statsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading cancellation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { stats, cancellations } = statsQuery.data || { stats: null, cancellations: [] };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Cancellation Management',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Cancellation Stats</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalCancellations}</Text>
                <Text style={styles.statLabel}>Total Cancellations</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.last24HourCancellations}</Text>
                <Text style={styles.statLabel}>Last 24 Hours</Text>
              </View>
            </View>
            
            <View style={[styles.statusIndicator, 
              stats.suspensionStatus === 'active' && styles.activeStatus,
              stats.suspensionStatus === 'suspended' && styles.suspendedStatus,
              stats.suspensionStatus === 'permanently_suspended' && styles.permanentStatus
            ]}>
              <Text style={styles.statusLabel}>
                Account Status: {stats.suspensionStatus.replace('_', ' ').toUpperCase()}
              </Text>
              {stats.suspensionReason && (
                <Text style={styles.suspensionReason}>
                  Reason: {stats.suspensionReason}
                </Text>
              )}
            </View>
            
            {stats.totalCancellations >= 2 && (
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color={theme.colors.warning} />
                <Text style={styles.warningText}>
                  {stats.totalCancellations === 2 
                    ? 'Warning: One more cancellation will result in permanent suspension'
                    : 'You are approaching the cancellation limit'
                  }
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Cancellation History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation History</Text>
          
          {cancellations.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color={theme.colors.text.secondary} />
              <Text style={styles.emptyStateText}>No cancellations</Text>
              <Text style={styles.emptyStateSubtext}>
                Your event cancellation history will appear here
              </Text>
            </View>
          ) : (
            cancellations.map(renderCancellationCard)
          )}
        </View>

        {/* Appeal Form */}
        {selectedCancellationId && (
          <View style={styles.appealForm}>
            <Text style={styles.appealFormTitle}>Submit Appeal</Text>
            <Text style={styles.appealFormSubtitle}>
              Explain why this cancellation should be reconsidered (minimum 20 characters)
            </Text>
            
            <TextInput
              style={styles.appealInput}
              placeholder="Provide detailed explanation for your appeal..."
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
            
            <Text style={styles.characterCount}>
              {appealReason.length}/1000 characters
            </Text>
            
            <View style={styles.appealActions}>
              <TouchableOpacity
                style={styles.cancelAppealButton}
                onPress={() => {
                  setSelectedCancellationId(null);
                  setAppealReason('');
                }}
                disabled={isSubmittingAppeal}
              >
                <Text style={styles.cancelAppealText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitAppealButton, 
                  (!appealReason.trim() || appealReason.length < 20) && styles.disabledButton
                ]}
                onPress={() => handleSubmitAppeal(selectedCancellationId)}
                disabled={isSubmittingAppeal || !appealReason.trim() || appealReason.length < 20}
              >
                {isSubmittingAppeal ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <Send size={16} color={theme.colors.white} />
                    <Text style={styles.submitAppealText}>Submit Appeal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Policy Information */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>Cancellation Policy</Text>
          <Text style={styles.policyText}>
            • Cancellations with less than 24 hours notice result in automatic penalties{'\n'}
            • Hosts receive automatic 1-star ratings (editable by business owner){'\n'}
            • Business owners pay 10% compensation to affected parties{'\n'}
            • 3+ cancellations result in permanent account suspension{'\n'}
            • Appeals are reviewed within 5-7 business days{'\n'}
            • RevoVend reserves the right to suspend accounts for any reason
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
    justifyContent: 'center',
    alignItems: 'center',
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
  statsCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeStatus: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  suspendedStatus: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  permanentStatus: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  suspensionReason: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.surface,
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
  cancellationCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancellationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancellationDate: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  statusBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appealedBadge: {
    backgroundColor: theme.colors.primary,
  },
  processedBadge: {
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  cancellationReason: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  cancellationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  penaltyText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '500',
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  appealButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  appealInfo: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appealLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  appealText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  appealDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  appealForm: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appealFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  appealFormSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  appealInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  appealActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelAppealButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelAppealText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  submitAppealButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitAppealText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.white,
  },
  policyCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  policyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});