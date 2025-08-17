import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { trpcClient } from '@/lib/trpc';
import { CheckCircle, AlertCircle, Mail, MessageSquare, Send } from 'lucide-react-native';
import { useUser } from '@/hooks/user-store';

interface SendResult {
  success: boolean;
  emailSent: boolean;
  smsSent: boolean;
  proposalId: string;
  message: string;
  invitationCode?: string;
}

export default function SendProposalTestNow() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [isSending, setIsSending] = useState<boolean>(true);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetEmail = useMemo(() => 'lashonsvoice@gmail.com', []);
  const targetPhone = useMemo(() => '706.464.0213', []);

  useEffect(() => {
    const run = async () => {
      console.log('[SendProposalTestNow] Starting test send');
      setIsSending(true);
      setError(null);
      try {
        const businessOwnerId = currentUser?.id ?? 'test_business_owner_1';
        const businessOwnerName = currentUser?.name ?? 'Test Business Owner';
        const businessName = (currentUser as any)?.businessName ?? 'RevoVend Test Co.';

        const now = new Date();
        const prettyDate = now.toLocaleDateString();
        const cityState = 'Atlanta, GA';

        const r = await trpcClient.proposals.sendExternal.mutate({
          businessOwnerId,
          businessOwnerName,
          businessName,
          businessOwnerContactEmail: (currentUser as any)?.contactEmail ?? 'noreply@revovend.com',
          eventId: `external_test_${Date.now()}`,
          eventTitle: 'Test Event (Automated) ',
          hostName: 'Test Host',
          hostEmail: targetEmail,
          hostPhone: targetPhone,
          proposedAmount: 500,
          contractorsNeeded: 2,
          message: `Greetings,\n\n${businessName} located in ${cityState} would like to RevoVend at your Test Event on ${prettyDate}. This is a test dispatch generated to validate email and SMS delivery.\n\nIf you received this message, the external proposal flow is working.`,
          eventDate: prettyDate,
          eventLocation: cityState,
        });
        console.log('[SendProposalTestNow] Result:', r);
        setResult(r);
        if (!r.success) {
          setError(r.message || 'Unknown error');
        }
      } catch (e: any) {
        console.error('[SendProposalTestNow] Error sending test proposal', e);
        setError('Failed to send test proposal. Please try again.');
      } finally {
        setIsSending(false);
      }
    };

    run();
  }, [currentUser, targetEmail, targetPhone]);

  return (
    <SafeAreaView style={styles.container} testID="send-proposal-test-now-screen">
      <Stack.Screen
        options={{
          title: 'Dispatch Test Proposal',
          headerStyle: { backgroundColor: '#8B5CF6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Send size={24} color="#8B5CF6" />
            <Text style={styles.title}>One-tap Test Dispatch</Text>
          </View>
          <Text style={styles.subtext}>Email: {targetEmail}</Text>
          <Text style={styles.subtext}>SMS: {targetPhone}</Text>
        </View>

        {isSending && (
          <View style={styles.stateCard} testID="sending-state">
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.stateText}>Sending test proposal…</Text>
          </View>
        )}

        {!isSending && error && (
          <View style={[styles.stateCard, styles.error]} testID="error-state">
            <AlertCircle size={22} color="#EF4444" />
            <Text style={[styles.stateText, styles.errorText]}>${'{'}error{'}'}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              testID="retry-button"
              style={styles.retryButton}
              onPress={() => {
                setIsSending(true);
                setError(null);
                setResult(null);
                // trigger again by toggling state via a small timeout
                setTimeout(() => {
                  // re-run effect by updating a dummy state or calling directly
                  // simplest: just call the mutation inline
                  (async () => {
                    try {
                      const businessOwnerId = currentUser?.id ?? 'test_business_owner_1';
                      const businessOwnerName = currentUser?.name ?? 'Test Business Owner';
                      const businessName = (currentUser as any)?.businessName ?? 'RevoVend Test Co.';
                      const now = new Date();
                      const prettyDate = now.toLocaleDateString();
                      const cityState = 'Atlanta, GA';
                      const r = await trpcClient.proposals.sendExternal.mutate({
                        businessOwnerId,
                        businessOwnerName,
                        businessName,
                        businessOwnerContactEmail: (currentUser as any)?.contactEmail ?? 'noreply@revovend.com',
                        eventId: `external_test_${Date.now()}`,
                        eventTitle: 'Test Event (Automated) ',
                        hostName: 'Test Host',
                        hostEmail: targetEmail,
                        hostPhone: targetPhone,
                        proposedAmount: 500,
                        contractorsNeeded: 2,
                        message: `Greetings,\n\n${businessName} located in ${cityState} would like to RevoVend at your Test Event on ${prettyDate}. This is a test dispatch generated to validate email and SMS delivery.\n\nIf you received this message, the external proposal flow is working.`,
                        eventDate: prettyDate,
                        eventLocation: cityState,
                      });
                      setResult(r);
                      if (!r.success) setError(r.message || 'Unknown error');
                    } catch (e: any) {
                      setError('Failed to send test proposal. Please try again.');
                    } finally {
                      setIsSending(false);
                    }
                  })();
                }, 100);
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isSending && result && (
          <View style={styles.resultCard} testID="result-state">
            <View style={styles.resultHeader}>
              {result.success ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <Text style={[styles.resultTitle, { color: result.success ? '#10B981' : '#EF4444' }]}>
                {result.success ? 'Proposal Sent' : 'Send Failed'}
              </Text>
            </View>

            <Text style={styles.resultMessage}>{result.message}</Text>

            {result.invitationCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Invitation Code</Text>
                <Text style={styles.codeText}>{result.invitationCode}</Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Mail size={16} color={result.emailSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.statText, { color: result.emailSent ? '#10B981' : '#9CA3AF' }]}>Email {result.emailSent ? 'sent' : 'not sent'}</Text>
              </View>
              <View style={styles.stat}>
                <MessageSquare size={16} color={result.smsSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.statText, { color: result.smsSent ? '#10B981' : '#9CA3AF' }]}>SMS {result.smsSent ? 'sent' : 'not sent'}</Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              testID="done-button"
              style={styles.doneButton}
              onPress={() => router.back()}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtext: { fontSize: 12, color: '#6B7280' },
  stateCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 14, color: '#374151' },
  error: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  errorText: { color: '#B91C1C' },
  retryButton: { marginTop: 8, backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  resultCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 18, fontWeight: '700' },
  resultMessage: { fontSize: 14, color: '#374151', lineHeight: 20 },
  codeBox: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 8, padding: 12 },
  codeLabel: { fontSize: 12, color: '#92400E', fontWeight: '700', marginBottom: 4 },
  codeText: { fontSize: 18, color: '#92400E', fontWeight: '800', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 12, fontWeight: '600' },
  doneButton: { marginTop: 8, backgroundColor: '#8B5CF6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  doneText: { color: '#FFFFFF', fontWeight: '700' },
});
