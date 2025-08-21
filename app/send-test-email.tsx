import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function SendTestEmailScreen() {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [autoTriggered, setAutoTriggered] = useState<boolean>(false);

  const mutation = trpc.notifications.sendTestEmail.useMutation();

  const payload = {
    to: 'Revovend1@gmail.com',
    subject: 'test',
    body: 'Test for body no attachment',
  } as const;

  const handleSend = useCallback(() => {
    console.log('[SendTestEmail] Sending with payload:', payload);
    mutation.mutate(payload, {
      onSuccess: (res) => {
        console.log('[SendTestEmail] Success:', res);
        setSentAt(Date.now());
      },
      onError: (err) => {
        console.error('[SendTestEmail] Error:', err);
      },
    });
  }, [mutation]);

  useEffect(() => {
    if (!autoTriggered) {
      setAutoTriggered(true);
      handleSend();
    }
  }, [autoTriggered, handleSend]);

  return (
    <View style={styles.container} testID="send-test-email-screen">
      <Stack.Screen options={{ title: 'Send Test Email' }} />
      <Text style={styles.title} testID="send-email-title">Send Test Email</Text>
      <Text style={styles.subtitle} testID="send-email-subtitle">To: {payload.to}</Text>
      <Text style={styles.subtitle} testID="send-email-subject">Subject: {payload.subject}</Text>
      <Text style={styles.subtitle} testID="send-email-body">Body: {payload.body}</Text>

      {mutation.isPending && (
        <View style={styles.statusRow} testID="status-sending">
          <ActivityIndicator />
          <Text style={styles.statusText}>Sending…</Text>
        </View>
      )}

      {mutation.isSuccess && (
        <View style={styles.successBox} testID="status-success">
          <Text style={styles.successText}>Sent {sentAt ? `at ${new Date(sentAt).toLocaleTimeString()}` : ''}</Text>
          <Text style={styles.successText}>Message ID: {(mutation.data as any)?.messageId ?? 'n/a'}</Text>
          {(mutation.data as any)?.fallback ? (
            <Text style={styles.noteText}>Note: Using fallback/stub (SendGrid not configured)</Text>
          ) : null}
        </View>
      )}

      {mutation.isError && (
        <View style={styles.errorBox} testID="status-error">
          <Text style={styles.errorText}>Failed to send: {(mutation.error as any)?.message ?? 'Unknown error'}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSend} testID="send-again-button" disabled={mutation.isPending}>
        <Text style={styles.buttonText}>{mutation.isPending ? 'Sending…' : 'Send Again'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#0b0f17' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#b6c0cc' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: '#b6c0cc' },
  successBox: { backgroundColor: '#0f2a17', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f7a3a' },
  successText: { color: '#9be7b1' },
  noteText: { color: '#d2e6ff', marginTop: 4 },
  errorBox: { backgroundColor: '#2a0f12', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#8a1f2a' },
  errorText: { color: '#ffb3bd' },
  button: { marginTop: 16, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
