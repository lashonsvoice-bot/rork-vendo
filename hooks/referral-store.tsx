import { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ReferralCode = {
  id: string;
  code: string;
  referrerId: string;
  referrerType: 'business_owner' | 'contractor' | 'host';
  createdAt: string;
  isActive: boolean;
  usageCount: number;
  maxUses?: number;
};

export type ReferralUsage = {
  id: string;
  referralCodeId: string;
  refereeId: string;
  refereeType: 'business_owner' | 'contractor' | 'host';
  signupDate: string;
  subscriptionDate?: string;
  rewardAmount: number;
  rewardPaid: boolean;
  rewardPaidDate?: string;
};

export type ReferralStats = {
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
};

export const [ReferralProvider, useReferral] = createContextHook(() => {
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  
  // Queries
  const statsQuery = trpc.referral.stats.useQuery();
  const historyQuery = trpc.referral.history.useQuery();
  
  // Mutations
  const createCodeMutation = trpc.referral.create.useMutation();
  const useCodeMutation = trpc.referral.use.useMutation();
  const payRewardMutation = trpc.referral.payReward.useMutation();
  
  const stats = statsQuery.data || {
    totalReferrals: 0,
    successfulReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
  };
  
  const history = historyQuery.data || { codes: [], usages: [] };
  const referralCodes = history.codes;
  const referralUsages = history.usages;
  
  // Create referral code
  const createReferralCode = useCallback(async (maxUses?: number) => {
    try {
      const code = await createCodeMutation.mutateAsync({ maxUses });
      await statsQuery.refetch();
      await historyQuery.refetch();
      setSelectedCode(code);
      return code;
    } catch (error) {
      console.error('[Referral] Failed to create code:', error);
      throw error;
    }
  }, [createCodeMutation, statsQuery, historyQuery]);
  
  // Use referral code
  const applyReferralCode = useCallback(async (code: string) => {
    try {
      const result = await useCodeMutation.mutateAsync({ code });
      await statsQuery.refetch();
      await historyQuery.refetch();
      return result;
    } catch (error) {
      console.error('[Referral] Failed to use code:', error);
      throw error;
    }
  }, [useCodeMutation, statsQuery, historyQuery]);
  
  // Pay reward
  const payReward = useCallback(async (usageId: string) => {
    try {
      const result = await payRewardMutation.mutateAsync({ usageId });
      await statsQuery.refetch();
      await historyQuery.refetch();
      return result;
    } catch (error) {
      console.error('[Referral] Failed to pay reward:', error);
      throw error;
    }
  }, [payRewardMutation, statsQuery, historyQuery]);
  
  // Share referral code
  const shareReferralCode = useCallback(async (code: ReferralCode) => {
    const shareUrl = `https://revovend.com/signup?ref=${code.code}`;
    const message = `Join RevoVend with my referral code ${code.code} and we both earn rewards! ${shareUrl}`;
    
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(shareUrl);
        alert('Referral link copied to clipboard!');
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: 'Join RevoVend',
        });
      }
    } catch (error) {
      console.error('[Referral] Failed to share code:', error);
      // Fallback to clipboard
      try {
        await Clipboard.setStringAsync(shareUrl);
        alert('Referral link copied to clipboard!');
      } catch (clipboardError) {
        console.error('[Referral] Failed to copy to clipboard:', clipboardError);
      }
    }
  }, []);
  
  // Copy referral code
  const copyReferralCode = useCallback(async (code: ReferralCode) => {
    try {
      await Clipboard.setStringAsync(code.code);
      alert('Referral code copied to clipboard!');
    } catch (error) {
      console.error('[Referral] Failed to copy code:', error);
    }
  }, []);
  
  // Copy referral link
  const copyReferralLink = useCallback(async (code: ReferralCode) => {
    const shareUrl = `https://revovend.com/signup?ref=${code.code}`;
    try {
      await Clipboard.setStringAsync(shareUrl);
      alert('Referral link copied to clipboard!');
    } catch (error) {
      console.error('[Referral] Failed to copy link:', error);
    }
  }, []);
  
  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([
      statsQuery.refetch(),
      historyQuery.refetch(),
    ]);
  }, [statsQuery, historyQuery]);
  
  return {
    // Data
    stats,
    referralCodes,
    referralUsages,
    selectedCode,
    
    // Actions
    createReferralCode,
    applyReferralCode,
    payReward,
    shareReferralCode,
    copyReferralCode,
    copyReferralLink,
    setSelectedCode,
    refresh,
    
    // Loading states
    isLoading: statsQuery.isLoading || historyQuery.isLoading,
    isCreatingCode: createCodeMutation.isPending,
    isUsingCode: useCodeMutation.isPending,
    isPayingReward: payRewardMutation.isPending,
  };
});

export function useReferralStats() {
  const { stats, isLoading } = useReferral();
  return { stats, isLoading };
}

export function useReferralCodes() {
  const { referralCodes, createReferralCode, isCreatingCode } = useReferral();
  return { referralCodes, createReferralCode, isCreatingCode };
}

export function useReferralSharing() {
  const { shareReferralCode, copyReferralCode, copyReferralLink } = useReferral();
  return { shareReferralCode, copyReferralCode, copyReferralLink };
}