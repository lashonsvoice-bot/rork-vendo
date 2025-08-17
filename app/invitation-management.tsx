import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { 
  Send, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Building2,
  Mail,
} from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';
import { theme } from '@/constants/theme';

interface ReverseProposal {
  id: string;
  hostId: string;
  businessId: string;
  eventId: string;
  invitationCost: number;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  viewedAt?: string;
  respondedAt?: string;
  emailSent: boolean;
  smsSent: boolean;
  isNewSignup?: boolean;
  conversionReward?: number;
}

export default function InvitationManagementScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');

  const proposalsQuery = trpc.businessDirectory.proposals.getByHost.useQuery();
  const businessesQuery = trpc.businessDirectory.getAll.useQuery();
  const eventsQuery = trpc.events.getAll.useQuery();

  const proposals = proposalsQuery.data || [];
  const businesses = businessesQuery.data || [];
  const events = eventsQuery.data || [];

  const getBusinessById = (id: string) => businesses.find(b => b.id === id);
  const getEventById = (id: string) => events.find(e => e.id === id);

  const filteredProposals = proposals.filter(proposal => {
    switch (selectedTab) {
      case 'pending':
        return proposal.status === 'sent' || proposal.status === 'viewed';
      case 'accepted':
        return proposal.status === 'accepted';
      case 'declined':
        return proposal.status === 'declined' || proposal.status === 'expired';
      default:
        return true;
    }
  });

  const stats = {
    totalInvitations: proposals.length,
    totalCost: proposals.reduce((sum, p) => sum + p.invitationCost, 0),
    conversions: proposals.filter(p => p.isNewSignup).length,
    totalRewards: proposals.filter(p => p.isNewSignup).length * 10,
    pending: proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    declined: proposals.filter(p => p.status === 'declined' || p.status === 'expired').length,
  };

  const netCost = stats.totalCost - stats.totalRewards;
  const conversionRate = stats.totalInvitations > 0 ? (stats.conversions / stats.totalInvitations) * 100 : 0;

  const getStatusIcon = (status: ReverseProposal['status']) => {
    switch (status) {
      case 'sent':
        return <Send size={16} color={theme.colors.blue[500]} />;
      case 'viewed':
        return <Eye size={16} color={theme.colors.gold[500]} />;
      case 'accepted':
        return <CheckCircle size={16} color={theme.colors.green[500]} />;
      case 'declined':
        return <XCircle size={16} color={theme.colors.red[500]} />;
      case 'expired':
        return <Clock size={16} color={theme.colors.gray[500]} />;
      default:
        return <Send size={16} color={theme.colors.gray[500]} />;
    }
  };

  const getStatusColor = (status: ReverseProposal['status']) => {
    switch (status) {
      case 'sent':
        return theme.colors.blue[500];
      case 'viewed':
        return theme.colors.gold[500];
      case 'accepted':
        return theme.colors.green[500];
      case 'declined':
        return theme.colors.red[500];
      case 'expired':
        return theme.colors.gray[500];
      default:
        return theme.colors.gray[500];
    }
  };

  const handleResendInvitation = (proposal: ReverseProposal) => {
    Alert.alert(
      'Resend Invitation',
      'This will send another invitation and charge you an additional $1. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resend', onPress: () => console.log('Resend invitation:', proposal.id) },
      ]
    );
  };

  if (user?.role !== 'event_host') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Invitation Management' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. Only event hosts can view invitation management.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Invitation Management' }} />
      
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <DollarSign size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>${stats.totalCost}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          
          <View style={styles.statCard}>
            <TrendingUp size={20} color={theme.colors.green[500]} />
            <Text style={styles.statValue}>${stats.totalRewards}</Text>
            <Text style={styles.statLabel}>Rewards Earned</Text>
          </View>
          
          <View style={styles.statCard}>
            <Send size={20} color={theme.colors.blue[500]} />
            <Text style={styles.statValue}>{stats.totalInvitations}</Text>
            <Text style={styles.statLabel}>Invitations</Text>
          </View>
          
          <View style={styles.statCard}>
            <CheckCircle size={20} color={theme.colors.green[500]} />
            <Text style={styles.statValue}>{conversionRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
        </View>
        
        <View style={styles.netCostContainer}>
          <Text style={styles.netCostLabel}>Net Cost:</Text>
          <Text style={[
            styles.netCostValue,
            { color: netCost > 0 ? theme.colors.red[500] : theme.colors.green[500] }
          ]}>
            ${Math.abs(netCost)} {netCost > 0 ? 'spent' : 'earned'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'all', label: 'All', count: stats.totalInvitations },
          { key: 'pending', label: 'Pending', count: stats.pending },
          { key: 'accepted', label: 'Accepted', count: stats.accepted },
          { key: 'declined', label: 'Declined', count: stats.declined },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.key && styles.activeTabText
            ]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Proposals List */}
      <ScrollView style={styles.proposalsList}>
        {filteredProposals.map((proposal) => {
          const business = getBusinessById(proposal.businessId);
          const event = getEventById(proposal.eventId);
          
          return (
            <View key={proposal.id} style={styles.proposalCard}>
              <View style={styles.proposalHeader}>
                <View style={styles.proposalInfo}>
                  <View style={styles.businessInfo}>
                    <Building2 size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.businessName}>{business?.businessName || 'Unknown Business'}</Text>
                  </View>
                  <Text style={styles.ownerName}>{business?.ownerName}</Text>
                </View>
                
                <View style={styles.statusContainer}>
                  {getStatusIcon(proposal.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.eventInfo}>
                <Calendar size={14} color={theme.colors.text.secondary} />
                <Text style={styles.eventText}>{event?.title || 'Unknown Event'}</Text>
                {event && (
                  <Text style={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.proposalDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sent:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(proposal.sentAt).toLocaleDateString()}
                  </Text>
                </View>
                
                {proposal.viewedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Viewed:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(proposal.viewedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                {proposal.respondedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Responded:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(proposal.respondedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cost:</Text>
                  <Text style={styles.detailValue}>${proposal.invitationCost}</Text>
                </View>
                
                {proposal.isNewSignup && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reward:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.green[500] }]}>
                      +${proposal.conversionReward || 10}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.contactInfo}>
                <Mail size={14} color={theme.colors.text.secondary} />
                <Text style={styles.contactText}>{business?.email}</Text>
              </View>

              {(proposal.status === 'declined' || proposal.status === 'expired') && (
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => handleResendInvitation(proposal)}
                >
                  <Send size={14} color={theme.colors.primary} />
                  <Text style={styles.resendButtonText}>Resend Invitation ($1)</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        
        {filteredProposals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Send size={48} color={theme.colors.gray[400]} />
            <Text style={styles.emptyText}>No invitations found</Text>
            <Text style={styles.emptySubtext}>
              {selectedTab === 'all' 
                ? 'Start by adding businesses to your directory and sending invitations.'
                : `No ${selectedTab} invitations at the moment.`
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  netCostContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  netCostLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginRight: 8,
  },
  netCostValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  proposalsList: {
    flex: 1,
    padding: 16,
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  proposalInfo: {
    flex: 1,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 6,
  },
  ownerName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  eventText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 6,
    flex: 1,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  proposalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blue[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  resendButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});