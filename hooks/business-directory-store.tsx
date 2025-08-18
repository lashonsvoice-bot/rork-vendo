import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc, trpcClient } from '@/lib/trpc';
import { useSubscription } from '@/hooks/subscription-store';

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
  latitude?: number;
  longitude?: number;
  zipCode?: string;
  state?: string;
  city?: string;
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
  const { canSendProposals } = useSubscription();

  const businessesQuery = trpc.businessDirectory.getAll.useQuery();
  const addBusinessMutation = trpc.businessDirectory.add.useMutation();
  const sendProposalMutation = trpc.businessDirectory.proposals.send.useMutation();
  const updateProposalMutation = trpc.businessDirectory.proposals.updateStatus.useMutation();
  const hostProposalsQuery = trpc.businessDirectory.proposals.getByHost.useQuery();

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

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const searchByDistance = useCallback(async (userLat: number, userLon: number, maxDistance: number, businessType?: string) => {
    try {
      const results = await trpcClient.businessDirectory.searchByDistance.query({
        userLat,
        userLon,
        maxDistance,
        businessType,
      });
      return results;
    } catch (error) {
      console.error('Error searching businesses by distance:', error);
      throw error;
    }
  }, []);

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
    if (!canSendProposals) {
      throw new Error('Proposals are not available during the free trial. Please upgrade your subscription to send proposals.');
    }
    
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
  }, [reverseProposals, sendProposalMutation, hostProposalsQuery, canSendProposals]);

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

  const searchBusinesses = useCallback((query: string, location?: string, userLat?: number, userLon?: number, maxDistance?: number) => {
    const searchTerm = query.toLowerCase();
    
    return businesses.filter(business => {
      const matchesQuery = 
        business.businessName.toLowerCase().includes(searchTerm) ||
        business.ownerName.toLowerCase().includes(searchTerm) ||
        business.businessType.toLowerCase().includes(searchTerm) ||
        business.description.toLowerCase().includes(searchTerm);
      
      const matchesLocation = !location || 
        business.location.toLowerCase().includes(location.toLowerCase()) ||
        business.zipCode?.toLowerCase().includes(location.toLowerCase()) ||
        business.state?.toLowerCase().includes(location.toLowerCase()) ||
        business.city?.toLowerCase().includes(location.toLowerCase());
      
      // Distance filtering
      let withinDistance = true;
      if (userLat && userLon && maxDistance && business.latitude && business.longitude) {
        const distance = calculateDistance(userLat, userLon, business.latitude, business.longitude);
        withinDistance = distance <= maxDistance;
      }
      
      return matchesQuery && matchesLocation && withinDistance;
    });
  }, [businesses, calculateDistance]);

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
    searchByDistance,
    calculateDistance,
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
    searchByDistance,
    calculateDistance,
    getProposalsByEvent,
    getProposalsByBusiness,
    getInvitationStats,
    businessesQuery.refetch,
    hostProposalsQuery.refetch,
  ]);
});