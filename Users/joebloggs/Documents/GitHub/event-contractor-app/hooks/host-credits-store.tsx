import React, { useState, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface HostCredit {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalUsed: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'used' | 'expired' | 'refunded' | 'purchased';
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: 'referral' | 'internal_proposal' | 'external_proposal' | 'purchase';
  createdAt: string;
}

interface HostCreditsState {
  credits: HostCredit | null;
  transactions: CreditTransaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCredits: () => Promise<void>;
  useCreditsForInternalProposal: (proposalId: string, eventId: string, recipientId: string) => Promise<boolean>;
  checkCreditsForProposal: (proposalType: 'internal' | 'external') => {
    canSend: boolean;
    requiresCredits: boolean;
    requiresPayment: boolean;
    creditsRequired?: number;
    currentBalance: number;
    message: string;
  };
  purchaseCredits: (amount: number) => Promise<void>;
  awardReferralCredits: (referralId: string, conversionType: 'subscription' | 'pro_upgrade') => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const STORAGE_KEY = 'host_credits';
const TRANSACTIONS_KEY = 'host_credit_transactions';

// Credit costs
const CREDIT_COSTS = {
  INTERNAL_REVERSE_PROPOSAL: 1,
};

// Credit rewards
const CREDIT_REWARDS = {
  REFERRAL_CONVERSION: 5,
  REFERRAL_PRO_UPGRADE: 3,
};

export const [HostCreditsProvider, useHostCredits] = createContextHook<HostCreditsState>(() => {
  const [credits, setCredits] = useState<HostCredit | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load credits from storage
  const loadCredits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [storedCredits, storedTransactions] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(TRANSACTIONS_KEY)
      ]);

      if (storedCredits) {
        setCredits(JSON.parse(storedCredits));
      }
      
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
    } catch (err) {
      console.error('Error loading credits:', err);
      setError('Failed to load credits');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize credits on mount
  useEffect(() => {
    loadCredits();
  }, []);

  // Save credits to storage
  const saveCredits = async (newCredits: HostCredit) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCredits));
      setCredits(newCredits);
    } catch (err) {
      console.error('Error saving credits:', err);
    }
  };

  // Save transaction
  const addTransaction = async (transaction: Omit<CreditTransaction, 'id' | 'createdAt'>) => {
    const newTransaction: CreditTransaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    const updatedTransactions = [newTransaction, ...transactions].slice(0, 100); // Keep last 100
    setTransactions(updatedTransactions);
    
    try {
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  // Use credits for internal proposal
  const useCreditsForInternalProposal = async (
    proposalId: string,
    eventId: string,
    recipientId: string
  ): Promise<boolean> => {
    if (!credits || credits.balance < CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL} credit(s) to send an internal reverse proposal. You have ${credits?.balance || 0} credits.`,
        [{ text: 'OK' }]
      );
      return false;
    }

    const updatedCredits: HostCredit = {
      ...credits,
      balance: credits.balance - CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      totalUsed: credits.totalUsed + CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      lastUpdated: new Date().toISOString()
    };

    await saveCredits(updatedCredits);
    await addTransaction({
      userId: credits.userId,
      type: 'used',
      amount: CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      description: 'Internal reverse proposal sent',
      referenceId: proposalId,
      referenceType: 'internal_proposal'
    });

    return true;
  };

  // Check if user can send proposal
  const checkCreditsForProposal = (proposalType: 'internal' | 'external') => {
    if (proposalType === 'external') {
      // External proposals require payment, not credits
      return {
        canSend: true,
        requiresCredits: false,
        requiresPayment: true,
        currentBalance: credits?.balance || 0,
        message: 'External reverse proposals require monetary payment'
      };
    }

    // Internal proposals require credits
    const hasEnoughCredits = credits && credits.balance >= CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL;
    
    return {
      canSend: !!hasEnoughCredits,
      requiresCredits: true,
      requiresPayment: false,
      creditsRequired: CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL,
      currentBalance: credits?.balance || 0,
      message: hasEnoughCredits
        ? `You have ${credits?.balance} credits available`
        : `You need ${CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL} credit(s). You have ${credits?.balance || 0} credits.`
    };
  };

  // Purchase credits (mock implementation)
  const purchaseCredits = async (amount: number) => {
    try {
      setIsLoading(true);
      
      // In production, this would integrate with payment processing
      const currentCredits = credits || {
        id: `credit_${Date.now()}`,
        userId: 'current_user', // This would come from auth
        balance: 0,
        totalEarned: 0,
        totalUsed: 0,
        lastUpdated: new Date().toISOString()
      };

      const updatedCredits: HostCredit = {
        ...currentCredits,
        balance: currentCredits.balance + amount,
        totalEarned: currentCredits.totalEarned + amount,
        lastUpdated: new Date().toISOString()
      };

      await saveCredits(updatedCredits);
      await addTransaction({
        userId: currentCredits.userId,
        type: 'purchased',
        amount,
        description: `Purchased ${amount} credits`,
        referenceType: 'purchase'
      });

      Alert.alert('Success', `${amount} credits added to your account`);
    } catch (err) {
      console.error('Error purchasing credits:', err);
      Alert.alert('Error', 'Failed to purchase credits');
    } finally {
      setIsLoading(false);
    }
  };

  // Award referral credits
  const awardReferralCredits = async (referralId: string, conversionType: 'subscription' | 'pro_upgrade') => {
    try {
      const creditsToAward = conversionType === 'subscription' 
        ? CREDIT_REWARDS.REFERRAL_CONVERSION 
        : CREDIT_REWARDS.REFERRAL_PRO_UPGRADE;

      const currentCredits = credits || {
        id: `credit_${Date.now()}`,
        userId: 'current_user',
        balance: 0,
        totalEarned: 0,
        totalUsed: 0,
        lastUpdated: new Date().toISOString()
      };

      const updatedCredits: HostCredit = {
        ...currentCredits,
        balance: currentCredits.balance + creditsToAward,
        totalEarned: currentCredits.totalEarned + creditsToAward,
        lastUpdated: new Date().toISOString()
      };

      await saveCredits(updatedCredits);
      await addTransaction({
        userId: currentCredits.userId,
        type: 'earned',
        amount: creditsToAward,
        description: conversionType === 'subscription' 
          ? 'Business referral converted to subscription'
          : 'Contractor referral upgraded to Pro',
        referenceId: referralId,
        referenceType: 'referral'
      });

      Alert.alert('Credits Earned!', `You earned ${creditsToAward} credits from your referral!`);
    } catch (err) {
      console.error('Error awarding referral credits:', err);
    }
  };

  // Refresh credits
  const refreshCredits = async () => {
    await loadCredits();
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!credits) return null;
    
    return {
      balance: credits.balance,
      totalEarned: credits.totalEarned,
      totalUsed: credits.totalUsed,
      proposalsRemaining: Math.floor(credits.balance / CREDIT_COSTS.INTERNAL_REVERSE_PROPOSAL)
    };
  }, [credits]);

  return {
    credits,
    transactions,
    isLoading,
    error,
    loadCredits,
    useCreditsForInternalProposal,
    checkCreditsForProposal,
    purchaseCredits,
    awardReferralCredits,
    refreshCredits,
    stats
  };
});