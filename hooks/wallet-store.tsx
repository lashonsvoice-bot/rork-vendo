import createContextHook from "@nkzw/create-context-hook";
import { useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type WalletBalance = {
  userId: string;
  balance: number;
  available: number;
  held: number;
  updatedAt: string;
};

export type WalletTransactionType =
  | "deposit"
  | "withdrawal"
  | "hold"
  | "release"
  | "capture"
  | "payout"
  | "refund";

export type WalletTransaction = {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  relatedId?: string;
  note?: string;
  createdAt: string;
};

export const [WalletProvider, useWallet] = createContextHook(() => {
  const balanceQuery = trpc.wallet.getBalance.useQuery(undefined, { 
    staleTime: 15_000,
    retry: (failureCount, error) => {
      console.log('[Wallet] Balance query retry:', failureCount, error?.message);
      if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    }
  });
  
  const txQuery = trpc.wallet.listTransactions.useQuery({ limit: 50 }, { 
    staleTime: 15_000,
    retry: (failureCount, error) => {
      console.log('[Wallet] Transactions query retry:', failureCount, error?.message);
      if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    }
  });

  const depositMutation = trpc.wallet.deposit.useMutation();
  const withdrawMutation = trpc.wallet.withdraw.useMutation();
  const holdMutation = trpc.wallet.hold.useMutation();
  const releaseMutation = trpc.wallet.release.useMutation();
  const captureMutation = trpc.wallet.capture.useMutation();
  const payoutMutation = trpc.wallet.payout.useMutation();

  const refresh = useCallback(async () => {
    await Promise.all([balanceQuery.refetch(), txQuery.refetch()]);
  }, [balanceQuery, txQuery]);

  const deposit = useCallback(async (amount: number, note?: string) => {
    const res = await depositMutation.mutateAsync({ amount, note });
    await refresh();
    return res;
  }, [depositMutation, refresh]);

  const withdraw = useCallback(async (amount: number, note?: string) => {
    const res = await withdrawMutation.mutateAsync({ amount, note });
    await refresh();
    return res;
  }, [withdrawMutation, refresh]);

  const hold = useCallback(async (amount: number, relatedId?: string, note?: string) => {
    const res = await holdMutation.mutateAsync({ amount, relatedId, note });
    await refresh();
    return res;
  }, [holdMutation, refresh]);

  const release = useCallback(async (amount: number, relatedId?: string, note?: string) => {
    const res = await releaseMutation.mutateAsync({ amount, relatedId, note });
    await refresh();
    return res;
  }, [releaseMutation, refresh]);

  const capture = useCallback(async (amount: number, relatedId?: string, note?: string) => {
    const res = await captureMutation.mutateAsync({ amount, relatedId, note });
    await refresh();
    return res;
  }, [captureMutation, refresh]);

  const payout = useCallback(async (amount: number, relatedId?: string, note?: string) => {
    const res = await payoutMutation.mutateAsync({ amount, relatedId, note });
    await refresh();
    return res;
  }, [payoutMutation, refresh]);

  return useMemo(() => ({
    balance: balanceQuery.data,
    isLoading: balanceQuery.isLoading || txQuery.isLoading,
    transactions: txQuery.data ?? [],
    deposit,
    withdraw,
    hold,
    release,
    capture,
    payout,
    refresh,
    isDepositing: depositMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
    isHolding: holdMutation.isPending,
    isReleasing: releaseMutation.isPending,
    isCapturing: captureMutation.isPending,
    isPayingOut: payoutMutation.isPending,
  }), [
    balanceQuery.data,
    balanceQuery.isLoading,
    txQuery.data,
    txQuery.isLoading,
    deposit,
    withdraw,
    hold,
    release,
    capture,
    payout,
    refresh,
    depositMutation.isPending,
    withdrawMutation.isPending,
    holdMutation.isPending,
    releaseMutation.isPending,
    captureMutation.isPending,
    payoutMutation.isPending,
  ]);
});
