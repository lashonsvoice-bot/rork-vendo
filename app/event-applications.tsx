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
  Building2,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Briefcase,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type BusinessInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

interface BusinessInvitation {
  id: string;
  businessId: string;
  businessName: string;
  eventId: string;
  hostId: string;
  status: BusinessInvitationStatus;
  invitedAt: string;
  respondedAt?: string;
  contractorsNeeded: number;
  contractorsHired: number;
  invitationCost: number;
}

export default function EventApplicationsScreen() {
  const { eventId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for business invitations - this should come from tRPC
  const mockBusinessInvitations: BusinessInvitation[] = [
    {
      id: 'inv_001',
      businessId: 'biz_001',
      businessName: 'Elite Event Services',
      eventId: eventId as string,
      hostId: 'host_001',
      status: 'accepted',
      invitedAt: '2024-01-15T10:00:00.000Z',
      respondedAt: '2024-01-15T11:30:00.000Z',
      contractorsNeeded: 3,
      contractorsHired: 2,
      invitationCost: 1,
    },
    {
      id: 'inv_002',
      businessId: 'biz_002',
      businessName: 'Professional Event Staff',
      eventId: eventId as string,
      hostId: 'host_001',
      status: 'pending',
      invitedAt: '2024-01-15T12:00:00.000Z',
      contractorsNeeded: 2,
      contractorsHired: 0,
      invitationCost: 1,
    },
  ];

  const businessInvitations = mockBusinessInvitations;
  const isLoading = false;
  
  const refetch = () => {
    console.log('Refetching business invitations...');
  };

  const pendingInvitations = businessInvitations.filter(inv => inv.status === 'pending');
  const acceptedInvitations = businessInvitations.filter(inv => inv.status === 'accepted');
  const rejectedInvitations = businessInvitations.filter(inv => inv.status === 'rejected');

  const handleViewBusinessContractors = (businessId: string, businessName: string) => {
    Alert.alert(
      'Business Contractor Management',
      `View and manage contractors working for ${businessName}. This includes:\n\n• Contractor applications to the business\n• Training progress\n• Event assignments\n• Performance tracking`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Contractors',
          onPress: () => {
            // Navigate to business contractor management
            console.log(`Navigate to business ${businessId} contractor management`);
          }
        }
      ]
    );
  };

  const handleInviteMoreBusinesses = () => {
    router.push('/business-directory');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: BusinessInvitationStatus) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'accepted': return { bg: '#D1FAE5', text: '#065F46' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'expired': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getStatusIcon = (status: BusinessInvitationStatus) => {
    switch (status) {
      case 'pending': return <MessageSquare size={16} color="#92400E" />;
      case 'accepted': return <CheckCircle size={16} color="#065F46" />;
      case 'rejected': return <XCircle size={16} color="#DC2626" />;
      case 'expired': return <XCircle size={16} color="#6B7280" />;
      default: return <MessageSquare size={16} color="#6B7280" />;
    }
  };

  const renderBusinessInvitationCard = (invitation: BusinessInvitation) => {
    const statusColors = getStatusColor(invitation.status);
    const isPending = invitation.status === 'pending';
    const isAccepted = invitation.status === 'accepted';
    const contractorProgress = invitation.contractorsHired / invitation.contractorsNeeded;

    return (
      <View key={invitation.id} style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorAvatar}>
              <Building2 size={20} color="#6366F1" />
            </View>
            <View style={styles.contractorDetails}>
              <View style={styles.contractorNameRow}>
                <Text style={styles.contractorName}>{invitation.businessName}</Text>
                <View style={styles.proBadge}>
                  <DollarSign size={12} color="#F59E0B" />
                  <Text style={styles.proBadgeText}>${invitation.invitationCost}</Text>
                </View>
              </View>
              <Text style={styles.applicationDate}>
                Invited {new Date(invitation.invitedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            {getStatusIcon(invitation.status)}
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
            </Text>
          </View>
        </View>

        {isAccepted && (
          <View style={styles.contractorProgressSection}>
            <Text style={styles.progressLabel}>Contractor Staffing Progress:</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(contractorProgress * 100, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {invitation.contractorsHired} / {invitation.contractorsNeeded} contractors hired
              </Text>
            </View>
          </View>
        )}

        <View style={styles.contractorStats}>
          <View style={styles.statItem}>
            <Users size={14} color="#6366F1" />
            <Text style={styles.statText}>Needs {invitation.contractorsNeeded} contractors</Text>
          </View>
          {isAccepted && (
            <View style={styles.statItem}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={styles.statText}>{invitation.contractorsHired} hired</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.statText}>
              {invitation.respondedAt ? `Responded ${new Date(invitation.respondedAt).toLocaleDateString()}` : 'Awaiting response'}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.pendingInfo}>
            <MessageSquare size={16} color="#92400E" />
            <Text style={styles.pendingText}>
              Waiting for {invitation.businessName} to accept invitation and start hiring contractors.
            </Text>
          </View>
        )}

        {isAccepted && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.viewContractorsButton}
              onPress={() => handleViewBusinessContractors(invitation.businessId, invitation.businessName)}
            >
              <Users size={16} color="#6366F1" />
              <Text style={styles.viewContractorsButtonText}>View Contractors</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/(tabs)/events/manage/${eventId}`)}
            >
              <Briefcase size={16} color="#FFFFFF" />
              <Text style={styles.manageButtonText}>Manage Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading business invitations...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Business Partnerships',
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
          <Text style={styles.headerTitle}>Business Partnership Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage businesses providing contractors for your event</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingInvitations.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{acceptedInvitations.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{businessInvitations.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {businessInvitations.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Business Partnerships Yet</Text>
              <Text style={styles.emptyStateText}>
                Invite businesses from the directory to provide contractors for your event.
              </Text>
              <TouchableOpacity 
                style={styles.inviteBusinessButton}
                onPress={handleInviteMoreBusinesses}
              >
                <Text style={styles.inviteBusinessButtonText}>Invite Businesses</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {pendingInvitations.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pending Invitations</Text>
                    <View style={styles.urgentBadge}>
                      <AlertCircle size={14} color="#DC2626" />
                      <Text style={styles.urgentText}>Awaiting Response</Text>
                    </View>
                  </View>
                  {pendingInvitations.map(renderBusinessInvitationCard)}
                </View>
              )}

              {acceptedInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Active Business Partners</Text>
                  {acceptedInvitations.map(renderBusinessInvitationCard)}
                </View>
              )}

              {rejectedInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Declined Invitations</Text>
                  {rejectedInvitations.map(renderBusinessInvitationCard)}
                </View>
              )}
              
              <View style={styles.inviteMoreSection}>
                <TouchableOpacity 
                  style={styles.inviteMoreButton}
                  onPress={handleInviteMoreBusinesses}
                >
                  <Building2 size={20} color="#6366F1" />
                  <View style={styles.inviteMoreContent}>
                    <Text style={styles.inviteMoreText}>Invite More Businesses</Text>
                    <Text style={styles.inviteMoreDescription}>Browse the business directory to find more partners</Text>
                  </View>
                  <ArrowRight size={20} color="#6366F1" />
                </TouchableOpacity>
              </View>
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
  viewContractorsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewContractorsButtonText: {
    fontSize: 14,
    color: '#6366F1',
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
    marginBottom: 20,
  },
  inviteBusinessButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteBusinessButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contractorProgressSection: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  inviteMoreSection: {
    marginTop: 20,
  },
  inviteMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  inviteMoreContent: {
    flex: 1,
  },
  inviteMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  inviteMoreDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});