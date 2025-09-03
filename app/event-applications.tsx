import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  Shield,
  Award,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

interface ContractorApplication {
  id: string;
  contractorId: string;
  eventId: string;
  hostId: string;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  message?: string;
  isEarlyAccess?: boolean;
}

export default function EventApplicationsScreen() {
  const { eventId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const applicationsQuery = trpc.contractor.applications.getForEvent.useQuery({
    eventId: eventId as string
  });

  const respondMutation = trpc.contractor.applications.respond.useMutation({
    onSuccess: () => {
      applicationsQuery.refetch();
      Alert.alert('Success', 'Application response sent successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    }
  });

  const applications = applicationsQuery.data || [];
  const pendingApplications = applications.filter(app => app.status === 'pending');
  const acceptedApplications = applications.filter(app => app.status === 'accepted');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const handleAcceptApplication = (applicationId: string) => {
    Alert.alert(
      'Accept Application',
      'Are you sure you want to hire this contractor? They will be notified and added to your event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Hire',
          style: 'default',
          onPress: () => {
            respondMutation.mutate({
              applicationId,
              status: 'accepted'
            });
          }
        }
      ]
    );
  };

  const handleRejectApplication = (applicationId: string) => {
    Alert.alert(
      'Reject Application',
      'Are you sure you want to reject this application? The contractor will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            respondMutation.mutate({
              applicationId,
              status: 'rejected'
            });
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await applicationsQuery.refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'accepted': return { bg: '#D1FAE5', text: '#065F46' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'withdrawn': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#92400E" />;
      case 'accepted': return <CheckCircle size={16} color="#065F46" />;
      case 'rejected': return <XCircle size={16} color="#DC2626" />;
      case 'withdrawn': return <XCircle size={16} color="#6B7280" />;
      default: return <Clock size={16} color="#6B7280" />;
    }
  };

  const renderApplicationCard = (application: ContractorApplication) => {
    const statusColors = getStatusColor(application.status);
    const isPending = application.status === 'pending';

    return (
      <View key={application.id} style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorAvatar}>
              <User size={20} color="#6366F1" />
            </View>
            <View style={styles.contractorDetails}>
              <View style={styles.contractorNameRow}>
                <Text style={styles.contractorName}>Contractor #{application.contractorId.slice(-3)}</Text>
                {application.isEarlyAccess && (
                  <View style={styles.proBadge}>
                    <Award size={12} color="#F59E0B" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.applicationDate}>
                Applied {new Date(application.appliedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            {getStatusIcon(application.status)}
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Text>
          </View>
        </View>

        {application.message && (
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Application Message:</Text>
            <Text style={styles.messageText}>{application.message}</Text>
          </View>
        )}

        <View style={styles.contractorStats}>
          <View style={styles.statItem}>
            <Star size={14} color="#F59E0B" />
            <Text style={styles.statText}>4.8 Rating</Text>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={styles.statText}>12 Events</Text>
          </View>
          <View style={styles.statItem}>
            <Shield size={14} color="#6366F1" />
            <Text style={styles.statText}>ID Verified</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(application.id)}
              disabled={respondMutation.isPending}
            >
              <XCircle size={16} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptApplication(application.id)}
              disabled={respondMutation.isPending}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept & Hire</Text>
            </TouchableOpacity>
          </View>
        )}

        {application.status === 'accepted' && (
          <View style={styles.hiredInfo}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.hiredText}>
              Hired on {application.respondedAt ? new Date(application.respondedAt).toLocaleDateString() : 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/(tabs)/events/manage/${eventId}`)}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (applicationsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contractor Applications',
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Hiring Dashboard</Text>
          <Text style={styles.headerSubtitle}>Review and manage contractor applications</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingApplications.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{acceptedApplications.length}</Text>
              <Text style={styles.statLabel}>Hired</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{applications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {applications.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Applications Yet</Text>
              <Text style={styles.emptyStateText}>
                Contractors will apply to your event and appear here for review.
              </Text>
            </View>
          ) : (
            <>
              {pendingApplications.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pending Applications</Text>
                    <View style={styles.urgentBadge}>
                      <AlertCircle size={14} color="#DC2626" />
                      <Text style={styles.urgentText}>Action Required</Text>
                    </View>
                  </View>
                  {pendingApplications.map(renderApplicationCard)}
                </View>
              )}

              {acceptedApplications.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Hired Contractors</Text>
                  {acceptedApplications.map(renderApplicationCard)}
                </View>
              )}

              {rejectedApplications.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Rejected Applications</Text>
                  {rejectedApplications.map(renderApplicationCard)}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  content: {
    padding: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  urgentText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractorAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  proBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '700',
  },
  applicationDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageSection: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  contractorStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hiredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  hiredText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  manageButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});