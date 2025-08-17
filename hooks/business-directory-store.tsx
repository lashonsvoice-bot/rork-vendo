import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

export interface BusinessDirectoryEntry {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  website?: string;
  location: string;
  isVerified: boolean;
  isRevoVendMember: boolean;
  addedBy: string;
  addedAt: string;
  invitationsSent: number;
  signupConversions: number;
}

export interface ReverseProposal {
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

const BUSINESS_DIRECTORY_STORAGE_KEY = 'business_directory_data';
const REVERSE_PROPOSALS_STORAGE_KEY = 'reverse_proposals_data';

export const [BusinessDirectoryProvider, useBusinessDirectory] = createContextHook(() => {
  const [businesses, setBusinesses] = useState<BusinessDirectoryEntry[]>([]);
  const [reverseProposals, setReverseProposals] = useState<ReverseProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const businessesQuery = trpc.businessDirectory.getAll.useQuery();
  const addBusinessMutation = trpc.businessDirectory.add.useMutation();
  const sendProposalMutation = trpc.businessDirectory.proposals.send.useMutation();
  const updateProposalMutation = trpc.businessDirectory.proposals.updateStatus.useMutation();
  const hostProposalsQuery = trpc.businessDirectory.proposals.getByHost.useQuery();
  const businessProposalsQuery = trpc.businessDirectory.proposals.getByBusiness.useQuery();

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    if (businessesQuery.data) {
      setBusinesses(businessesQuery.data);
      saveBusinessesToStorage(businessesQuery.data);
    }
  }, [businessesQuery.data]);

  useEffect(() => {
    if (hostProposalsQuery.data) {
      setReverseProposals(hostProposalsQuery.data);
      saveProposalsToStorage(hostProposalsQuery.data);
    }
  }, [hostProposalsQuery.data]);

  const loadStoredData = async () => {
    try {
      const [businessesData, proposalsData] = await Promise.all([
        AsyncStorage.getItem(BUSINESS_DIRECTORY_STORAGE_KEY),
        AsyncStorage.getItem(REVERSE_PROPOSALS_STORAGE_KEY),
      ]);

      if (businessesData) {
        const parsed = JSON.parse(businessesData);
        setBusinesses(parsed);
      }

      if (proposalsData) {
        const parsed = JSON.parse(proposalsData);
        setReverseProposals(parsed);
      }
    } catch (error) {
      console.error('Error loading business directory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBusinessesToStorage = async (data: BusinessDirectoryEntry[]) => {
    try {
      await AsyncStorage.setItem(BUSINESS_DIRECTORY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving businesses to storage:', error);
    }
  };

  const saveProposalsToStorage = async (data: ReverseProposal[]) => {
    try {
      await AsyncStorage.setItem(REVERSE_PROPOSALS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving proposals to storage:', error);
    }
  };

  const addBusiness = useCallback(async (businessData: Omit<BusinessDirectoryEntry, 'id' | 'addedAt' | 'invitationsSent' | 'signupConversions'>) => {
    try {
      const newBusiness = await addBusinessMutation.mutateAsync(businessData);
      const updatedBusinesses = [...businesses, newBusiness];
      setBusinesses(updatedBusinesses);
      saveBusinessesToStorage(updatedBusinesses);
      businessesQuery.refetch();
      return newBusiness;
    } catch (error) {
      console.error('Error adding business:', error);
      throw error;
    }
  }, [businesses, addBusinessMutation, businessesQuery]);

  const sendInvitation = useCallback(async (proposalData: {
    businessId: string;
    eventId: string;
    invitationCost?: number;
    emailSent?: boolean;
    smsSent?: boolean;
  }) => {
    try {
      const newProposal = await sendProposalMutation.mutateAsync({
        invitationCost: 1,
        emailSent: true,
        smsSent: true,
        ...proposalData,
      });
      
      const updatedProposals = [...reverseProposals, newProposal];
      setReverseProposals(updatedProposals);
      saveProposalsToStorage(updatedProposals);
      hostProposalsQuery.refetch();
      
      return newProposal;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }, [reverseProposals, sendProposalMutation, hostProposalsQuery]);

  const updateProposalStatus = useCallback(async (proposalId: string, status: ReverseProposal['status'], isNewSignup?: boolean) => {
    try {
      const updatedProposal = await updateProposalMutation.mutateAsync({
        proposalId,
        status,
        isNewSignup,
      });
      
      const updatedProposals = reverseProposals.map(p => 
        p.id === proposalId ? updatedProposal : p
      );
      setReverseProposals(updatedProposals);
      saveProposalsToStorage(updatedProposals);
      
      return updatedProposal;
    } catch (error) {
      console.error('Error updating proposal status:', error);
      throw error;
    }
  }, [reverseProposals, updateProposalMutation]);

  const searchBusinesses = useCallback((query: string, location?: string) => {
    const searchTerm = query.toLowerCase();
    
    return businesses.filter(business => {
      const matchesQuery = 
        business.businessName.toLowerCase().includes(searchTerm) ||
        business.ownerName.toLowerCase().includes(searchTerm) ||
        business.businessType.toLowerCase().includes(searchTerm) ||
        business.description.toLowerCase().includes(searchTerm);
      
      const matchesLocation = !location || 
        business.location.toLowerCase().includes(location.toLowerCase());
      
      return matchesQuery && matchesLocation;
    });
  }, [businesses]);

  const getProposalsByEvent = useCallback((eventId: string) => {
    return reverseProposals.filter(proposal => proposal.eventId === eventId);
  }, [reverseProposals]);

  const getProposalsByBusiness = useCallback((businessId: string) => {
    return reverseProposals.filter(proposal => proposal.businessId === businessId);
  }, [reverseProposals]);

  const getInvitationStats = useMemo(() => {
    const totalInvitations = reverseProposals.length;
    const totalCost = reverseProposals.reduce((sum, p) => sum + p.invitationCost, 0);
    const conversions = reverseProposals.filter(p => p.isNewSignup).length;
    const totalRewards = conversions * 10;
    const netCost = totalCost - totalRewards;

    return {
      totalInvitations,
      totalCost,
      conversions,
      totalRewards,
      netCost,
      conversionRate: totalInvitations > 0 ? (conversions / totalInvitations) * 100 : 0,
    };
  }, [reverseProposals]);

  return useMemo(() => ({
    businesses,
    reverseProposals,
    isLoading,
    addBusiness,
    sendInvitation,
    updateProposalStatus,
    searchBusinesses,
    getProposalsByEvent,
    getProposalsByBusiness,
    getInvitationStats,
    refetchBusinesses: businessesQuery.refetch,
    refetchProposals: hostProposalsQuery.refetch,
  }), [
    businesses,
    reverseProposals,
    isLoading,
    addBusiness,
    sendInvitation,
    updateProposalStatus,
    searchBusinesses,
    getProposalsByEvent,
    getProposalsByBusiness,
    getInvitationStats,
    businessesQuery.refetch,
    hostProposalsQuery.refetch,
  ]);
});