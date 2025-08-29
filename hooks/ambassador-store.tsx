/**
 * Ambassador Store
 * Manages ambassador authentication and referral state
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

interface Ambassador {
  id: string;
  email: string;
  name: string;
  referralCode: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}

interface AmbassadorReferral {
  id: string;
  referredEmail: string;
  referredRole: 'business_owner' | 'host' | 'contractor';
  referralLink?: string;
  status: 'pending' | 'converted' | 'expired';
  conversionDate?: string;
  commissionRate: number;
  commissionEarned: number;
  created_at: string;
}

interface AmbassadorStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}

const STORAGE_KEY = 'ambassador_auth';

export const [AmbassadorProvider, useAmbassador] = createContextHook(() => {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referrals, setReferrals] = useState<AmbassadorReferral[]>([]);
  const [stats, setStats] = useState<AmbassadorStats | null>(null);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { ambassador: storedAmbassador, token: storedToken } = JSON.parse(stored);
        setAmbassador(storedAmbassador);
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to load ambassador auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuth = async (ambassadorData: Ambassador, authToken: string) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ambassador: ambassadorData, token: authToken })
      );
      setAmbassador(ambassadorData);
      setToken(authToken);
    } catch (error) {
      console.error('Failed to save ambassador auth:', error);
    }
  };

  const clearAuth = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setAmbassador(null);
      setToken(null);
      setReferrals([]);
      setStats(null);
    } catch (error) {
      console.error('Failed to clear ambassador auth:', error);
    }
  };

  // Mutations
  const signupMutation = trpc.ambassador.auth.signup.useMutation({
    onSuccess: (data: any) => {
      console.log('[AmbassadorStore] Signup success:', data);
      if (data.success && data.ambassador && data.token) {
        saveAuth(data.ambassador as Ambassador, data.token);
      }
    },
    onError: (error) => {
      console.error('[AmbassadorStore] Signup error:', error);
    }
  });

  const loginMutation = trpc.ambassador.auth.login.useMutation({
    onSuccess: (data: any) => {
      console.log('[AmbassadorStore] Login success:', data);
      if (data.success && data.ambassador && data.token) {
        saveAuth(data.ambassador as Ambassador, data.token);
      }
    },
    onError: (error) => {
      console.error('[AmbassadorStore] Login error:', error);
    }
  });

  const createReferralMutation = trpc.ambassador.referrals.create.useMutation();
  const generateLinkMutation = trpc.ambassador.referrals.generateLink.useMutation();

  // Queries
  const referralsQuery = trpc.ambassador.referrals.getAll.useQuery(
    { ambassadorId: ambassador?.id || '' },
    { 
      enabled: !!ambassador?.id
    }
  );

  const statsQuery = trpc.ambassador.referrals.getStats.useQuery(
    { ambassadorId: ambassador?.id || '' },
    { 
      enabled: !!ambassador?.id
    }
  );

  // Update state when query data changes
  useEffect(() => {
    if (referralsQuery.data?.success && referralsQuery.data?.referrals) {
      setReferrals(referralsQuery.data.referrals);
    }
  }, [referralsQuery.data]);

  useEffect(() => {
    if (statsQuery.data?.success && statsQuery.data?.stats) {
      setStats(statsQuery.data.stats);
    }
  }, [statsQuery.data]);

  // Actions
  const signup = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {
    console.log('[AmbassadorStore] Attempting signup with:', { ...data, password: '***' });
    try {
      const result = await signupMutation.mutateAsync(data);
      console.log('[AmbassadorStore] Signup result:', result);
      return result;
    } catch (error) {
      console.error('[AmbassadorStore] Signup failed:', error);
      throw error;
    }
  }, [signupMutation]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[AmbassadorStore] Attempting login with:', { email, password: '***' });
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      console.log('[AmbassadorStore] Login result:', result);
      return result;
    } catch (error) {
      console.error('[AmbassadorStore] Login failed:', error);
      throw error;
    }
  }, [loginMutation]);

  const logout = useCallback(() => {
    clearAuth();
  }, []);

  const createReferral = useCallback(async (
    referredEmail: string,
    referredRole: 'business_owner' | 'host' | 'contractor'
  ) => {
    if (!ambassador) throw new Error('Not authenticated');
    
    const result = await createReferralMutation.mutateAsync({
      ambassadorId: ambassador.id,
      referredEmail,
      referredRole
    });

    if (result.success) {
      await referralsQuery.refetch();
      await statsQuery.refetch();
    }

    return result;
  }, [ambassador, createReferralMutation, referralsQuery, statsQuery]);

  const generateReferralLink = useCallback(async (
    targetRole: 'business_owner' | 'host' | 'contractor'
  ) => {
    if (!ambassador) throw new Error('Not authenticated');
    
    return generateLinkMutation.mutateAsync({
      ambassadorId: ambassador.id,
      targetRole
    });
  }, [ambassador, generateLinkMutation]);

  const refreshData = useCallback(async () => {
    if (ambassador?.id) {
      await Promise.all([
        referralsQuery.refetch(),
        statsQuery.refetch()
      ]);
    }
  }, [ambassador?.id, referralsQuery, statsQuery]);

  // Computed values
  const isAuthenticated = !!ambassador && !!token;

  const pendingReferrals = useMemo(() => 
    referrals.filter(r => r.status === 'pending'),
    [referrals]
  );

  const convertedReferrals = useMemo(() => 
    referrals.filter(r => r.status === 'converted'),
    [referrals]
  );

  const monthlyEarnings = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return convertedReferrals
      .filter(r => r.conversionDate && new Date(r.conversionDate) >= startOfMonth)
      .reduce((sum, r) => sum + r.commissionEarned, 0);
  }, [convertedReferrals]);

  return useMemo(() => ({
    // State
    ambassador,
    token,
    isLoading,
    isAuthenticated,
    referrals,
    pendingReferrals,
    convertedReferrals,
    stats,
    monthlyEarnings,

    // Actions
    signup,
    login,
    logout,
    createReferral,
    generateReferralLink,
    refreshData,

    // Loading states
    isSigningUp: signupMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isCreatingReferral: createReferralMutation.isPending,
    isGeneratingLink: generateLinkMutation.isPending,
    isLoadingReferrals: referralsQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Errors
    signupError: signupMutation.error,
    loginError: loginMutation.error,
    createReferralError: createReferralMutation.error,
    generateLinkError: generateLinkMutation.error
  }), [
    ambassador,
    token,
    isLoading,
    referrals,
    pendingReferrals,
    convertedReferrals,
    stats,
    monthlyEarnings,
    signup,
    login,
    logout,
    createReferral,
    generateReferralLink,
    refreshData,
    signupMutation.isPending,
    loginMutation.isPending,
    createReferralMutation.isPending,
    generateLinkMutation.isPending,
    referralsQuery.isLoading,
    statsQuery.isLoading,
    signupMutation.error,
    loginMutation.error,
    createReferralMutation.error,
    generateLinkMutation.error,
    isAuthenticated
  ]);
});