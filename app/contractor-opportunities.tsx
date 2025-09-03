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
import { Stack, router } from 'expo-router';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Award,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';

type BusinessOpportunity = {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  hostId: string;
  hostName: string;
  contractorsNeeded: number;
  contractorsHired: number;
  hourlyRate: number;
  duration: string;
  description: string;
  requirements: string[];
  trainingRequired: boolean;
  businessRating: number;
  businessCompletedEvents: number;
  applicationDeadline: string;
  status: 'open' | 'closing_soon' | 'filled';
  isEarlyAccess: boolean;
};

// Mock data - this would come from tRPC
const mockOpportunities: BusinessOpportunity[] = [
  {
    id: 'opp_001',
    businessId: 'biz_001',
    businessName: 'Elite Event Services',
    businessType: 'Event Staffing',
    eventId: 'event_001',
    eventTitle: 'Tech Innovation Expo 2024',
    eventDate: '2024-01-20T09:00:00.000Z',
    eventLocation: 'Convention Center Hall A',
    hostId: 'host_001',
    hostName: 'TechCorp Inc.',
    contractorsNeeded: 3,
    contractorsHired: 1,
    hourlyRate: 25,
    duration: '8 hours',
    description: 'Looking for professional event staff to assist with trade show operations, guest registration, and product demonstrations.',
    requirements: ['Professional attire', 'Customer service experience', 'Bilingual preferred'],
    trainingRequired: true,
    businessRating: 4.8,
    businessCompletedEvents: 24,
    applicationDeadline: '2024-01-18T23:59:59.000Z',
    status: 'open',
    isEarlyAccess: true,
  },
  {
    id: 'opp_002',
    businessId: 'biz_002',
    businessName: 'Professional Event Staff',
    businessType: 'Hospitality Services',
    eventId: 'event_002',
    eventTitle: 'Corporate Gala Dinner',
    eventDate: '2024-01-25T18:00:00.000Z',
    eventLocation: 'Grand Ballroom Hotel',
    hostId: 'host_002',
    hostName: 'Corporate Events LLC',
    contractorsNeeded: 5,
    contractorsHired: 3,
    hourlyRate: 22,
    duration: '6 hours',
    description: 'Seeking experienced hospitality staff for upscale corporate dinner event. Food service and guest relations experience required.',
    requirements: ['Food service experience', 'Formal attire', 'Evening availability'],
    trainingRequired: true,
    businessRating: 4.6,
    businessCompletedEvents: 18,
    applicationDeadline: '2024-01-23T23:59:59.000Z',
    status: 'closing_soon',
    isEarlyAccess: false,
  },
  {
    id: 'opp_003',
    businessId: 'biz_003',
    businessName: 'Event Solutions Pro',
    businessType: 'Event Management',
    eventId: 'event_003',
    eventTitle: 'Product Launch Conference',
    eventDate: '2024-01-30T10:00:00.000Z',
    eventLocation: 'Business Center Downtown',
    hostId: 'host_003',
    hostName: 'StartupXYZ',
    contractorsNeeded: 2,
    contractorsHired: 2,
    hourlyRate: 28,
    duration: '4 hours',
    description: 'Full-day product launch event requiring setup, registration, and breakdown assistance.',
    requirements: ['Setup experience', 'Tech-savvy', 'Professional communication'],
    trainingRequired: false,
    businessRating: 4.9,
    businessCompletedEvents: 31,
    applicationDeadline: '2024-01-28T23:59:59.000Z',
    status: 'filled',
    isEarlyAccess: true,
  },
];

export default function ContractorOpportunitiesScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'open' | 'early_access'>('all');

  // This would be a real tRPC query
  const opportunities = mockOpportunities;
  const isLoading = false;

  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedFilter === 'open') return opp.status === 'open';
    if (selectedFilter === 'early_access') return opp.isEarlyAccess;
    return true;
  });

  const openOpportunities = opportunities.filter(opp => opp.status === 'open');
  const earlyAccessOpportunities = opportunities.filter(opp => opp.isEarlyAccess);

  const handleApplyToBusiness = (opportunity: BusinessOpportunity) => {
    Alert.alert(
      'Apply to Business',
      `Apply to work for ${opportunity.businessName} at the ${opportunity.eventTitle} event?\n\nThis will start the business hiring process:\n\n• Application review by business\n• Business-specific training\n• W-9 and ID verification\n• Event assignment`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            Alert.alert(
              'Application Submitted',
              `Your application has been sent to ${opportunity.businessName}. They will review your application and contact you if selected.\n\nNext steps if hired:\n✓ Complete business training\n✓ Submit W-9 forms\n✓ ID verification\n✓ Event briefing`,
              [
                {
                  text: 'View Training Info',
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

  const handleViewBusinessProfile = (businessId: string, businessName: string) => {
    Alert.alert(
      'Business Profile',
      `View detailed profile for ${businessName} including:\n\n• Past events and reviews\n• Training requirements\n• Payment history\n• Contractor testimonials`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Profile',
          onPress: () => {
            console.log(`Navigate to business profile: ${businessId}`);
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch opportunities
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#D1FAE5', text: '#065F46' };
      case 'closing_soon': return { bg: '#FEF3C7', text: '#92400E' };
      case 'filled': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'closing_soon': return 'Closing Soon';
      case 'filled': return 'Filled';
      default: return 'Unknown';
    }
  };

  const renderOpportunityCard = (opportunity: BusinessOpportunity) => {
    const statusColors = getStatusColor(opportunity.status);
    const isOpen = opportunity.status === 'open';
    const spotsRemaining = opportunity.contractorsNeeded - opportunity.contractorsHired;
    const deadlineDate = new Date(opportunity.applicationDeadline);
    const isDeadlineSoon = deadlineDate.getTime() - Date.now() < 48 * 60 * 60 * 1000; // 48 hours

    return (
      <View key={opportunity.id} style={styles.opportunityCard}>
        <View style={styles.opportunityHeader}>
          <View style={styles.businessInfo}>
            <View style={styles.businessAvatar}>
              <Building2 size={20} color="#6366F1" />
            </View>
            <View style={styles.businessDetails}>
              <View style={styles.businessNameRow}>
                <Text style={styles.businessName}>{opportunity.businessName}</Text>
                {opportunity.isEarlyAccess && (
                  <View style={styles.earlyAccessBadge}>
                    <Award size={12} color="#F59E0B" />
                    <Text style={styles.earlyAccessText}>EARLY</Text>
                  </View>
                )}
              </View>
              <Text style={styles.businessType}>{opportunity.businessType}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {getStatusText(opportunity.status)}
            </Text>
          </View>
        </View>

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{opportunity.eventTitle}</Text>
          <Text style={styles.hostName}>Hosted by {opportunity.hostName}</Text>
        </View>

        <View style={styles.opportunityStats}>
          <View style={styles.statItem}>
            <Calendar size={14} color="#6366F1" />
            <Text style={styles.statText}>
              {new Date(opportunity.eventDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MapPin size={14} color="#6366F1" />
            <Text style={styles.statText}>{opportunity.eventLocation}</Text>
          </View>
          <View style={styles.statItem}>
            <DollarSign size={14} color="#10B981" />
            <Text style={styles.statText}>${opportunity.hourlyRate}/hr • {opportunity.duration}</Text>
          </View>
        </View>

        <View style={styles.positionsInfo}>
          <View style={styles.positionsRow}>
            <View style={styles.statItem}>
              <Users size={14} color="#6366F1" />
              <Text style={styles.statText}>
                {spotsRemaining} of {opportunity.contractorsNeeded} positions available
              </Text>
            </View>
            {opportunity.trainingRequired && (
              <View style={styles.trainingBadge}>
                <Briefcase size={12} color="#6366F1" />
                <Text style={styles.trainingText}>Training Required</Text>
              </View>
            )}
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(opportunity.contractorsHired / opportunity.contractorsNeeded) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <Text style={styles.description}>{opportunity.description}</Text>

        <View style={styles.requirementsSection}>
          <Text style={styles.requirementsLabel}>Requirements:</Text>
          <View style={styles.requirementsContainer}>
            {opportunity.requirements.map((req, index) => (
              <View key={index} style={styles.requirementTag}>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.businessRating}>
          <Star size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {opportunity.businessRating} rating • {opportunity.businessCompletedEvents} events completed
          </Text>
        </View>

        <View style={styles.deadlineInfo}>
          <Clock size={14} color={isDeadlineSoon ? '#DC2626' : '#6B7280'} />
          <Text style={[styles.deadlineText, { color: isDeadlineSoon ? '#DC2626' : '#6B7280' }]}>
            Application deadline: {deadlineDate.toLocaleDateString()} at {deadlineDate.toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewBusinessButton}
            onPress={() => handleViewBusinessProfile(opportunity.businessId, opportunity.businessName)}
          >
            <Building2 size={16} color="#6366F1" />
            <Text style={styles.viewBusinessButtonText}>View Business</Text>
          </TouchableOpacity>
          
          {isOpen && (
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => handleApplyToBusiness(opportunity)}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!user || user.role !== 'contractor') {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Business Opportunities' }} />
        <Text style={styles.errorText}>This screen is only available to contractors.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Business Opportunities' }} />
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Business Opportunities',
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
          <Text style={styles.headerTitle}>Business Opportunities</Text>
          <Text style={styles.headerSubtitle}>Find work with verified businesses</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{openOpportunities.length}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{earlyAccessOpportunities.length}</Text>
              <Text style={styles.statLabel}>Early Access</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{opportunities.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.workflowInfo}>
            <View style={styles.workflowHeader}>
              <Briefcase size={20} color="#6366F1" />
              <Text style={styles.workflowTitle}>How It Works</Text>
            </View>
            <Text style={styles.workflowDescription}>
              You work FOR businesses, not directly for hosts. When you apply:
            </Text>
            <View style={styles.workflowSteps}>
              <View style={styles.workflowStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.workflowStepText}>Business reviews your application</Text>
              </View>
              <View style={styles.workflowStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.workflowStepText}>Complete business-specific training</Text>
              </View>
              <View style={styles.workflowStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.workflowStepText}>Submit W-9 forms & ID verification</Text>
              </View>
              <View style={styles.workflowStep}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.workflowStepText}>Get assigned to specific events</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                All ({opportunities.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'open' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('open')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'open' && styles.filterButtonTextActive]}>
                Open ({openOpportunities.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'early_access' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('early_access')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'early_access' && styles.filterButtonTextActive]}>
                Early Access ({earlyAccessOpportunities.length})
              </Text>
            </TouchableOpacity>
          </View>

          {filteredOpportunities.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Opportunities Available</Text>
              <Text style={styles.emptyStateText}>
                {selectedFilter === 'open' ? 'No open positions at the moment.' :
                 selectedFilter === 'early_access' ? 'No early access opportunities available.' :
                 'Check back later for new business opportunities.'}
              </Text>
            </View>
          ) : (
            filteredOpportunities.map(renderOpportunityCard)
          )}

          <View style={styles.nextStepsSection}>
            <Text style={styles.nextStepsTitle}>Need Help?</Text>
            <TouchableOpacity
              style={styles.nextStepButton}
              onPress={() => router.push('/training-materials')}
            >
              <Briefcase size={20} color="#6366F1" />
              <View style={styles.nextStepContent}>
                <Text style={styles.nextStepText}>View Training Process</Text>
                <Text style={styles.nextStepDescription}>Learn about business training requirements</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
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
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
  },
  workflowStepText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  opportunityCard: {
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
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessDetails: {
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  earlyAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  earlyAccessText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '700',
  },
  businessType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: '#6B7280',
  },
  opportunityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  positionsInfo: {
    marginBottom: 12,
  },
  positionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trainingText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
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
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  requirementsSection: {
    marginBottom: 12,
  },
  requirementsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requirementTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  businessRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewBusinessButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewBusinessButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  applyButtonText: {
    fontSize: 14,
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