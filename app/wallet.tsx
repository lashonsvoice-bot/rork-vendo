import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from "react-native";
import { Stack } from "expo-router";
import { useWallet } from "@/hooks/wallet-store";
import { useAuth } from "@/hooks/auth-store";
import { Banknote, ArrowDownCircle, ArrowUpCircle, Shield, DollarSign, Info } from "lucide-react-native";

export default function WalletScreen() {
  const { user } = useAuth();
  const { balance, transactions, isLoading, deposit, withdraw, payout, hold, release, capture, isDepositing, isWithdrawing, isPayingOut } = useWallet();
  const [amountText, setAmountText] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const amount = useMemo(() => {
    const n = parseFloat(amountText.replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }, [amountText]);

  const disabled = isLoading || isDepositing || isWithdrawing || isPayingOut;

  const onDeposit = useCallback(async () => {
    try {
      if (amount <= 0) {
        Alert.alert("Invalid amount", "Enter a positive amount");
        return;
      }
      await deposit(amount, note);
      setAmountText("");
      setNote("");
      Alert.alert("Success", "Funds added to wallet");
    } catch (e) {
      Alert.alert("Deposit failed", e instanceof Error ? e.message : "Try again later");
    }
  }, [amount, note, deposit]);

  const onWithdraw = useCallback(async () => {
    try {
      if (amount <= 0) {
        Alert.alert("Invalid amount", "Enter a positive amount");
        return;
      }
      await withdraw(amount, note);
      setAmountText("");
      setNote("");
      Alert.alert("Success", "Withdrawal requested");
    } catch (e) {
      Alert.alert("Withdraw failed", e instanceof Error ? e.message : "Try again later");
    }
  }, [amount, note, withdraw]);

  const onPayout = useCallback(async () => {
    try {
      if (amount <= 0) {
        Alert.alert("Invalid amount", "Enter a positive amount");
        return;
      }
      await payout(amount, note);
      setAmountText("");
      setNote("");
      Alert.alert("Success", "Payout sent");
    } catch (e) {
      Alert.alert("Payout failed", e instanceof Error ? e.message : "Try again later");
    }
  }, [amount, note, payout]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "Wallet" }} />

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Banknote size={24} color="#10B981" />
          <Text style={styles.balanceTitle}>Business Owner Wallet</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>${(balance?.balance ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text style={styles.balanceValue}>${(balance?.available ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Held</Text>
          <Text style={styles.balanceValue}>${(balance?.held ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.notice}>
          <Shield size={14} color="#6B7280" />
          <Text style={styles.noticeText}>Funds here will be auto-debited for contractor stipends and end-of-event payments.</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Add or Move Money</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="$0.00"
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            value={amountText}
            onChangeText={setAmountText}
            testID="amount-input"
          />
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Note (optional)"
            value={note}
            onChangeText={setNote}
            testID="note-input"
          />
        </View>
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onDeposit} disabled={disabled} testID="deposit-btn">
            <ArrowDownCircle size={18} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onWithdraw} disabled={disabled} testID="withdraw-btn">
            <ArrowUpCircle size={18} color="#10B981" />
            <Text style={styles.btnSecondaryText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onPayout} disabled={disabled} testID="payout-btn">
            <DollarSign size={18} color="#FFFFFF" />
            <Text style={styles.btnDangerText}>Payout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.helperRow}>
          <Info size={14} color="#6B7280" />
          <Text style={styles.helperText}>Use Payout to immediately pay contractors or event expenses from your available funds.</Text>
        </View>
      </View>

      <View style={styles.txCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {transactions && transactions.length > 0 ? (
          transactions.map((t) => (
            <View key={t.id} style={styles.txRow}>
              <Text style={styles.txType}>{t.type.toUpperCase()}</Text>
              <Text style={[styles.txAmount, t.amount >= 0 ? styles.txAmountPos : styles.txAmountNeg]}>
                {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
              </Text>
              <Text style={styles.txNote} numberOfLines={1}>{t.note ?? ''}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: "#6B7280", textAlign: "center", paddingVertical: 8 }}>No transactions yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  balanceTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  balanceLabel: { color: "#6B7280" },
  balanceValue: { color: "#111827", fontWeight: "700" },
  notice: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 8, marginTop: 10 },
  noticeText: { fontSize: 12, color: "#374151", flex: 1 },
  actionsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 10 },
  noteInput: { flex: 1.2 },
  buttonsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: "#10B981" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "700" },
  btnSecondary: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  btnSecondaryText: { color: "#10B981", fontWeight: "700" },
  btnDanger: { backgroundColor: "#111827" },
  btnDangerText: { color: "#FFFFFF", fontWeight: "700" },
  helperRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  helperText: { fontSize: 12, color: "#6B7280", flex: 1 },
  txCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  txType: { width: 90, color: "#6B7280", fontSize: 12 },
  txAmount: { width: 90, textAlign: "right", fontWeight: "700" },
  txAmountPos: { color: "#059669" },
  txAmountNeg: { color: "#B91C1C" },
  txNote: { flex: 1, color: "#374151" },
});
