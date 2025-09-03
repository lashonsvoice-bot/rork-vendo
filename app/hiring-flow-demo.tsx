import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Shield,
  Award,
  AlertCircle,
  ArrowRight,
  Users,
  FileText,
  Briefcase,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mock data for demonstration
type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

type MockApplication = {
  id: string;
  contractorId: string;
  contractorName: string;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  message: string;
  isEarlyAccess: boolean;
  rating: number;
  completedEvents: number;
  specialties: string[];
  verified: boolean;
};

const mockApplications: MockApplication[] = [
  {
    id: 'app_001',
    contractorId: 'contractor_001',
    contractorName: 'Sarah Johnson',
    status: 'pending' as const,
    appliedAt: '2024-01-15T10:00:00.000Z',
    message: 'I have 3 years of experience in corporate events and trade shows. I specialize in guest registration, product demonstrations, and crowd management. I\'m available for the full 8-hour shift and have my own professional attire.',
    isEarlyAccess: true,
    rating: 4.9,
    completedEvents: 24,
    specialties: ['Guest Registration', 'Product Demo', 'Crowd Management'],
    verified: true,
  },
  {
    id: 'app_002',
    contractorId: 'contractor_002',
    contractorName: 'Michael Chen',
    status: 'pending' as const,
    appliedAt: '2024-01-15T10:15:00.000Z',
    message: 'Professional event contractor with food service and hospitality background. I can handle setup, breakdown, and customer interactions. Available all day with flexible schedule.',
    isEarlyAccess: false,
    rating: 4.7,
    completedEvents: 18,
    specialties: ['Food Service', 'Setup/Breakdown', 'Customer Service'],
    verified: true,
  },
  {
    id: 'app_003',
    contractorId: 'contractor_003',
    contractorName: 'Emily Rodriguez',
    status: 'accepted' as const,
    appliedAt: '2024-01-15T09:45:00.000Z',
    respondedAt: '2024-01-15T11:30:00.000Z',
    message: 'Experienced trade show contractor with bilingual capabilities (English/Spanish). I excel at lead generation and product education. Ready to represent your brand professionally.',
    isEarlyAccess: true,
    rating: 4.8,
    completedEvents: 31,
    specialties: ['Lead Generation', 'Bilingual', 'Product Education'],
    verified: true,
  },
];

const mockEvent = {
  id: 'event_001',
  title: 'Tech Innovation Expo 2024',
  date: 'January 20, 2024',
  location: 'Convention Center Hall A',
  contractorPay: 25,
  duration: '8 hours',
  description: 'Large technology trade show featuring 200+ vendors and 5,000+ attendees',
};

export default function HiringFlowDemoScreen() {
  // This demo should show the correct flow: Host -> Business -> Contractor
  React.useEffect(() => {
    Alert.alert(
      'Incorrect Workflow Demo',
      'This demo shows contractors applying directly to hosts, which is not the correct flow. The actual workflow is:\n\n1. Host invites Business (via Business Directory)\n2. Business accepts and needs contractors\n3. Contractors work FOR the business\n4. Business manages contractor training\n\nWould you like to see the correct Business Directory flow instead?',
      [
        {
          text: 'View Business Directory',
          onPress: () => router.replace('/business-directory')
        },
        {
          text: 'Stay Here (Demo Only)',
          style: 'cancel'
        }
      ]
    );
  }, []);

  const [selectedTab, setSelectedTab] = useState<'pending' | 'hired' | 'all'>('pending');
  const [applications, setApplications] = useState<MockApplication[]>(mockApplications);

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const hiredApplications = applications.filter(app => app.status === 'accepted');

  const handleAcceptApplication = (applicationId: string) => {
    Alert.alert(
      'Hire Contractor',
      'This will officially hire the contractor and start the onboarding process. They will receive:\n\n• Hiring confirmation\n• Event details & materials\n• Training requirements\n• W-9 tax forms\n• ID verification requirements\n\nProceed with hiring?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hire Contractor',
          style: 'default',
          onPress: () => {
            setApplications(prev => prev.map(app => 
              app.id === applicationId 
                ? { ...app, status: 'accepted' as ApplicationStatus, respondedAt: new Date().toISOString() }
                : app
            ));
            Alert.alert(
              'Contractor Hired!',
              'The contractor has been hired and will receive onboarding instructions. They will appear in your event management dashboard once they complete:\n\n✓ W-9 Tax Forms\n✓ ID Verification\n✓ Training Materials\n✓ Event-specific briefing',
              [
                {
                  text: 'View Training Workflow',
                  onPress: () => router.push('/training-materials')
                },
                { text: 'OK' }
              ]
            );
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
            setApplications(prev => prev.map(app => 
              app.id === applicationId 
                ? { ...app, status: 'rejected' as ApplicationStatus, respondedAt: new Date().toISOString() }
                : app
            ));
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'accepted': return { bg: '#D1FAE5', text: '#065F46' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const renderApplicationCard = (application: MockApplication) => {
    const statusColors = getStatusColor(application.status);
    const isPending = application.status === 'pending';
    const isHired = application.status === 'accepted';

    return (
      <View key={application.id} style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorAvatar}>
              <User size={20} color="#6366F1" />
            </View>
            <View style={styles.contractorDetails}>
              <View style={styles.contractorNameRow}>
                <Text style={styles.contractorName}>{application.contractorName}</Text>
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
            {application.status === 'pending' && <Clock size={16} color={statusColors.text} />}
            {application.status === 'accepted' && <CheckCircle size={16} color={statusColors.text} />}
            {application.status === 'rejected' && <XCircle size={16} color={statusColors.text} />}
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.contractorStats}>
          <View style={styles.statItem}>
            <Star size={14} color="#F59E0B" />
            <Text style={styles.statText}>{application.rating} Rating</Text>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={styles.statText}>{application.completedEvents} Events</Text>
          </View>
          {application.verified && (
            <View style={styles.statItem}>
              <Shield size={14} color="#6366F1" />
              <Text style={styles.statText}>ID Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.specialtiesSection}>
          <Text style={styles.specialtiesLabel}>Specialties:</Text>
          <View style={styles.specialtiesContainer}>
            {application.specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyText}>{specialty}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Application Message:</Text>
          <Text style={styles.messageText}>{application.message}</Text>
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(application.id)}
            >
              <XCircle size={16} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptApplication(application.id)}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Hire Contractor</Text>
            </TouchableOpacity>
          </View>
        )}

        {isHired && (
          <View style={styles.hiredInfo}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.hiredText}>
              Hired on {application.respondedAt ? new Date(application.respondedAt).toLocaleDateString() : 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => Alert.alert('Next Steps', 'Contractor will appear in Event Management once they complete onboarding (W-9, ID verification, training).')}
            >
              <Text style={styles.manageButtonText}>View Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredApplications = selectedTab === 'pending' ? pendingApplications : 
                              selectedTab === 'hired' ? hiredApplications : 
                              applications;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Hiring Flow Demo',
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      
      <ScrollView style={styles.container}>
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Contractor Hiring Dashboard</Text>
          <Text style={styles.headerSubtitle}>{mockEvent.title}</Text>
          
          <View style={styles.eventInfo}>
            <Text style={styles.eventDetail}>{mockEvent.date} • {mockEvent.location}</Text>
            <Text style={styles.eventDetail}>${mockEvent.contractorPay}/hour • {mockEvent.duration}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingApplications.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{hiredApplications.length}</Text>
              <Text style={styles.statLabel}>Hired</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{applications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.workflowInfo}>
            <View style={styles.workflowHeader}>
              <Briefcase size={20} color="#6366F1" />
              <Text style={styles.workflowTitle}>Hiring Workflow</Text>
            </View>
            <Text style={styles.workflowDescription}>
              When you hire a contractor, they automatically enter the onboarding process:
            </Text>
            <View style={styles.workflowSteps}>
              <View style={styles.workflowStep}>
                <FileText size={16} color="#10B981" />
                <Text style={styles.workflowStepText}>1. W-9 Tax Forms & ID Verification</Text>
              </View>
              <View style={styles.workflowStep}>
                <Users size={16} color="#10B981" />
                <Text style={styles.workflowStepText}>2. Business-Specific Training</Text>
              </View>
              <View style={styles.workflowStep}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.workflowStepText}>3. Event Assignment & Check-in</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
              onPress={() => setSelectedTab('pending')}
            >
              <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
                Pending ({pendingApplications.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'hired' && styles.activeTab]}
              onPress={() => setSelectedTab('hired')}
            >
              <Text style={[styles.tabText, selectedTab === 'hired' && styles.activeTabText]}>
                Hired ({hiredApplications.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
              onPress={() => setSelectedTab('all')}
            >
              <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
                All ({applications.length})
              </Text>
            </TouchableOpacity>
          </View>

          {selectedTab === 'pending' && pendingApplications.length > 0 && (
            <View style={styles.urgentSection}>
              <View style={styles.urgentHeader}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.urgentText}>Action Required</Text>
              </View>
              <Text style={styles.urgentDescription}>
                You have {pendingApplications.length} contractor application{pendingApplications.length !== 1 ? 's' : ''} waiting for review.
              </Text>
            </View>
          )}

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Applications</Text>
              <Text style={styles.emptyStateText}>
                {selectedTab === 'pending' ? 'No pending applications to review.' :
                 selectedTab === 'hired' ? 'No contractors hired yet.' :
                 'No applications received for this event.'}
              </Text>
            </View>
          ) : (
            filteredApplications.map(renderApplicationCard)
          )}

          <View style={styles.nextStepsSection}>
            <Text style={styles.nextStepsTitle}>Next Steps</Text>
            <TouchableOpacity
              style={styles.nextStepButton}
              onPress={() => router.push('/training-materials')}
            >
              <Users size={20} color="#6366F1" />
              <View style={styles.nextStepContent}>
                <Text style={styles.nextStepText}>View Training Workflow</Text>
                <Text style={styles.nextStepDescription}>See how contractors complete business-specific training</Text>
              </View>
              <ArrowRight size={20} color="#6366F1" />
            </TouchableOpacity>
          </View>
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
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  eventInfo: {
    marginBottom: 20,
  },
  eventDetail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 2,
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
  workflowInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  workflowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  workflowDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  workflowSteps: {
    gap: 8,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workflowStepText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  urgentSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  urgentText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  urgentDescription: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  specialtiesSection: {
    marginBottom: 12,
  },
  specialtiesLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  specialtyText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
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
  nextStepsSection: {
    marginTop: 20,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  nextStepButton: {
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
  },
  nextStepContent: {
    flex: 1,
  },
  nextStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  nextStepDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});