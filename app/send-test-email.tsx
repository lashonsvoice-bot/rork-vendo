import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, Image } from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Paperclip, Trash2 } from 'lucide-react-native';

interface AttachmentItem {
  url: string;
  filename: string;
  mimeType: string;
}

export default function SendTestEmailScreen() {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [autoTriggered, setAutoTriggered] = useState<boolean>(false);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([{
    url: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/v4dvo6k5wc0d1ff9pko68',
    filename: 'quote.jpg',
    mimeType: 'image/jpeg',
  }]);

  const mutation = trpc.notifications.sendTestEmail.useMutation();

  const payload = useMemo(() => ({
    to: 'Revovend1@gmail.com',
    subject: 'test',
    body: 'Test for body no attachment',
    attachments,
  }), [attachments]);

  const handleSend = useCallback(() => {
    console.log('[SendTestEmail] Sending with payload:', payload);
    mutation.mutate(payload as any, {
      onSuccess: (res) => {
        console.log('[SendTestEmail] Success:', res);
        setSentAt(Date.now());
      },
      onError: (err) => {
        console.error('[SendTestEmail] Error:', err);
      },
    });
  }, [mutation, payload]);

  useEffect(() => {
    if (!autoTriggered && autoSend) {
      setAutoTriggered(true);
      handleSend();
    }
  }, [autoTriggered, autoSend, handleSend]);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <View style={styles.container} testID="send-test-email-screen">
      <Stack.Screen options={{ title: 'Send Test Email' }} />
      <Text style={styles.title} testID="send-email-title">Send Test Email</Text>

      <View style={styles.rowBetween}>
        <Text style={styles.subtitle} testID="send-email-subtitle">To: {payload.to}</Text>
        <View style={styles.toggleWrap}>
          <Text style={styles.subtitle}>Auto-send</Text>
          <Switch value={autoSend} onValueChange={setAutoSend} testID="auto-send-toggle" />
        </View>
      </View>

      <Text style={styles.subtitle} testID="send-email-subject">Subject: {payload.subject}</Text>
      <Text style={styles.subtitle} testID="send-email-body">Body: {payload.body}</Text>

      <View style={styles.attachHeader}>
        <Paperclip color="#b6c0cc" size={16} />
        <Text style={styles.subtitle}>Attachments ({attachments.length})</Text>
      </View>

      <View style={styles.attachList}>
        {attachments.map((a, idx) => (
          <View key={a.url + idx.toString()} style={styles.attachItem} testID={`attachment-${idx}`}>
            <Image source={{ uri: a.url }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.attachMeta}>
              <Text style={styles.attachName}>{a.filename}</Text>
              <Text style={styles.attachType}>{a.mimeType}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeAttachment(idx)} testID={`remove-attachment-${idx}`}>
              <Trash2 size={16} color="#ffb3bd" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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
        <Text style={styles.buttonText}>{mutation.isPending ? 'Sending…' : 'Send Email'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#0b0f17' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#b6c0cc' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  attachList: { gap: 8 },
  attachItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121826', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#1f2937' },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#0b0f17' },
  attachMeta: { flex: 1, marginLeft: 10 },
  attachName: { color: '#e5e7eb', fontWeight: '600' },
  attachType: { color: '#9ca3af', fontSize: 12 },
  removeBtn: { padding: 6 },
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
