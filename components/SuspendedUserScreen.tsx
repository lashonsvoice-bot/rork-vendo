import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth-store';
import { trpc } from '@/lib/trpc';
import { Ban, FileText } from 'lucide-react-native';

const theme = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#C6C6C8',
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
  },
};

export default function SuspendedUserScreen() {
  const { user, signout } = useAuth();
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealDescription, setAppealDescription] = useState('');

  const { data: suspensionData } = trpc.admin.checkSuspension.useQuery();
  
  const submitAppealMutation = trpc.admin.submitAppeal.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Your appeal has been submitted and will be reviewed by our admin team.');
      setShowAppealForm(false);
      setAppealReason('');
      setAppealDescription('');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmitAppeal = () => {
    if (!appealReason.trim() || !appealDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (appealDescription.length < 10) {
      Alert.alert('Error', 'Please provide a more detailed description (at least 10 characters)');
      return;
    }

    submitAppealMutation.mutate({
      reason: appealReason.trim(),
      description: appealDescription.trim(),
    });
  };

  if (showAppealForm) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.appealContainer}>
            <FileText size={48} color={theme.primary} />
            <Text style={styles.appealTitle}>Submit Appeal</Text>
            <Text style={styles.appealSubtitle}>
              Please provide details about why your account should be reinstated.
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Reason for Appeal</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Misunderstanding, Technical Error, etc."
                value={appealReason}
                onChangeText={setAppealReason}
                maxLength={100}
              />

              <Text style={styles.label}>Detailed Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Please explain your situation in detail..."
                value={appealDescription}
                onChangeText={setAppealDescription}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {appealDescription.length}/1000 characters
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setShowAppealForm(false)}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleSubmitAppeal}
                  disabled={submitAppealMutation.isPending}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitAppealMutation.isPending ? 'Submitting...' : 'Submit Appeal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.suspendedContainer}>
        <Ban size={64} color={theme.error} />
        <Text style={styles.suspendedTitle}>Account Suspended</Text>
        
        {suspensionData?.suspendedReason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{suspensionData.suspendedReason}</Text>
          </View>
        )}
        
        {suspensionData?.suspendedAt && (
          <Text style={styles.dateText}>
            Suspended on: {new Date(suspensionData.suspendedAt).toLocaleDateString()}
          </Text>
        )}

        <Text style={styles.suspendedMessage}>
          Your account has been suspended. If you believe this is an error, you can submit an appeal for review.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowAppealForm(true)}
          >
            <Text style={styles.primaryButtonText}>Submit Appeal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={signout}
          >
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  suspendedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  appealContainer: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
  },
  suspendedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  appealTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  appealSubtitle: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  reasonContainer: {
    backgroundColor: theme.gray[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 16,
    color: theme.error,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 16,
  },
  suspendedMessage: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: theme.text.secondary,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.primary,
  },
  secondaryButton: {
    backgroundColor: theme.gray[200],
    borderWidth: 1,
    borderColor: theme.border,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});