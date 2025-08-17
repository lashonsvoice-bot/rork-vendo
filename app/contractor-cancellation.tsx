import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { 
  AlertTriangle, 
  Clock, 
  X,
  Send,
  Ban,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import FileUpload from '@/components/FileUpload';

export default function ContractorCancellationScreen() {
  const { eventId, eventTitle, eventDate, eventTime } = useLocalSearchParams<{
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
  }>();

  const [reason, setReason] = useState<string>('');
  const [proofFiles, setProofFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const cancelEventMutation = trpc.events.cancellation.cancelContractor.useMutation();
  const suspensionQuery = trpc.events.cancellation.checkSuspension.useQuery();

  const eventDateTime = new Date(`${eventDate} ${eventTime}`);
  const now = new Date();
  const hoursUntilEvent = Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isLessThan12Hours = hoursUntilEvent < 12;
  const isLessThan24Hours = hoursUntilEvent < 24;

  const handleCancel = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    if (reason.trim().length < 10) {
      Alert.alert('Error', 'Cancellation reason must be at least 10 characters');
      return;
    }

    if (isLessThan12Hours && proofFiles.length === 0) {
      Alert.alert(
        'Documentation Required', 
        'Cancellations within 12 hours require proof documentation (police report, medical excuse, etc.)'
      );
      return;
    }

    const warningMessage = isLessThan12Hours 
      ? 'WARNING: Cancelling within 12 hours will result in IMMEDIATE ACCOUNT SUSPENSION for any reason. You will need to appeal by email to reactivate your account.'
      : isLessThan24Hours 
      ? 'This cancellation is within 24 hours and will result in penalties.'
      : 'Are you sure you want to cancel this event?';

    Alert.alert(
      'Confirm Cancellation',
      warningMessage,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel Event', 
          style: 'destructive',
          onPress: submitCancellation 
        },
      ]
    );
  };

  const submitCancellation = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await cancelEventMutation.mutateAsync({
        eventId: eventId!,
        reason: reason.trim(),
        proofFiles,
      });

      let message = 'Event cancelled successfully.';
      
      if (result.suspended) {
        message = 'Event cancelled. Your account has been suspended due to cancellation within 12 hours. Please check your email for appeal instructions.';
      } else if (result.penalties.automaticRating) {
        message += ' You have received an automatic 1-star rating due to less than 24 hours notice.';
      }
      
      if (result.penalties.compensationAmount) {
        message += ` You will be charged $${result.penalties.compensationAmount.toFixed(2)} as compensation.`;
      }

      Alert.alert('Event Cancelled', message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (fileUrl: string) => {
    setProofFiles(prev => [...prev, fileUrl]);
  };

  const handleFileRemove = (fileUrl: string) => {
    setProofFiles(prev => prev.filter(url => url !== fileUrl));
  };

  if (suspensionQuery.data?.isSuspended) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Account Suspended',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text.primary,
          }} 
        />
        
        <View style={styles.suspendedContainer}>
          <Ban size={64} color={theme.colors.error} />
          <Text style={styles.suspendedTitle}>Account Suspended</Text>
          <Text style={styles.suspendedMessage}>
            Your contractor account has been suspended. Please check your email for appeal instructions.
          </Text>
          
          {suspensionQuery.data.suspensionDetails && (
            <View style={styles.suspensionDetails}>
              <Text style={styles.suspensionReason}>
                Reason: {suspensionQuery.data.suspensionDetails.reason}
              </Text>
              <Text style={styles.appealEmail}>
                Appeal Email: support@revovend.com
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Cancel Event',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.eventDateTime}>
            {new Date(eventDate!).toLocaleDateString()} at {eventTime}
          </Text>
        </View>

        {/* Critical Warning for < 12 hours */}
        {isLessThan12Hours && (
          <View style={styles.criticalWarning}>
            <Ban size={24} color={theme.colors.error} />
            <View style={styles.warningContent}>
              <Text style={styles.criticalWarningTitle}>
                CRITICAL: Less than 12 Hours Notice
              </Text>
              <Text style={styles.criticalWarningMessage}>
                Cancelling within 12 hours will result in IMMEDIATE ACCOUNT SUSPENSION for any reason. You will need to appeal by email to reactivate your account.
              </Text>
            </View>
          </View>
        )}

        {/* Warning Section */}
        <View style={[styles.warningCard, isLessThan24Hours && styles.urgentWarning]}>
          <AlertTriangle 
            size={24} 
            color={isLessThan24Hours ? theme.colors.error : theme.colors.warning} 
          />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, isLessThan24Hours && styles.urgentText]}>
              {isLessThan24Hours ? 'URGENT: Less than 24 Hours Notice' : 'Cancellation Notice'}
            </Text>
            <Text style={styles.warningMessage}>
              {isLessThan24Hours 
                ? 'Cancelling with less than 24 hours notice will result in automatic penalties.'
                : `You have ${hoursUntilEvent} hours until the event.`
              }
            </Text>
          </View>
        </View>

        {/* Penalties Info */}
        {isLessThan24Hours && (
          <View style={styles.penaltiesCard}>
            <Text style={styles.penaltiesTitle}>Automatic Penalties for Contractors</Text>
            
            <View style={styles.penaltyItem}>
              <AlertTriangle size={20} color={theme.colors.error} />
              <Text style={styles.penaltyText}>
                Automatic 1-star rating (affects future job opportunities)
              </Text>
            </View>
            
            <View style={styles.penaltyItem}>
              <Clock size={20} color={theme.colors.error} />
              <Text style={styles.penaltyText}>
                Loss of payment for this event
              </Text>
            </View>
            
            {isLessThan12Hours && (
              <View style={styles.penaltyItem}>
                <Ban size={20} color={theme.colors.error} />
                <Text style={styles.penaltyText}>
                  IMMEDIATE account suspension - appeal required to reactivate
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Proof Documentation (Required for < 12 hours) */}
        {isLessThan12Hours && (
          <View style={styles.proofSection}>
            <Text style={styles.proofTitle}>Required Documentation</Text>
            <Text style={styles.proofSubtitle}>
              Upload proof for your cancellation (police report, medical excuse, emergency documentation, etc.)
            </Text>
            
            <FileUpload
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
              fileType="all"
              multiple={true}
              currentFiles={proofFiles}
              label="Upload Proof Documents"
              description="Accepted: Images (JPG, PNG), PDFs, Word documents"
            />
            
            {proofFiles.length === 0 && (
              <View style={styles.proofWarning}>
                <AlertTriangle size={16} color={theme.colors.error} />
                <Text style={styles.proofWarningText}>
                  Documentation is required for cancellations within 12 hours
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Optional Documentation for 12-24 hours */}
        {isLessThan24Hours && !isLessThan12Hours && (
          <View style={styles.proofSection}>
            <Text style={styles.proofTitle}>Optional Documentation</Text>
            <Text style={styles.proofSubtitle}>
              Upload supporting documentation if you have a valid reason (medical, emergency, etc.)
            </Text>
            
            <FileUpload
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
              fileType="all"
              multiple={true}
              currentFiles={proofFiles}
              label="Upload Supporting Documents (Optional)"
              description="This may help with appeals if penalties are applied"
            />
          </View>
        )}

        {/* Cancellation Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Reason for Cancellation</Text>
          <Text style={styles.formSubtitle}>
            Please provide a detailed explanation (minimum 10 characters)
          </Text>
          
          <TextInput
            style={styles.reasonInput}
            placeholder="Explain why you need to cancel this event..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          
          <Text style={styles.characterCount}>
            {reason.length}/500 characters
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <X size={20} color={theme.colors.text.secondary} />
            <Text style={styles.cancelButtonText}>Keep Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton, 
              (!reason.trim() || reason.length < 10 || (isLessThan12Hours && proofFiles.length === 0)) && styles.disabledButton
            ]}
            onPress={handleCancel}
            disabled={
              isSubmitting || 
              !reason.trim() || 
              reason.length < 10 || 
              (isLessThan12Hours && proofFiles.length === 0)
            }
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Send size={20} color={theme.colors.white} />
                <Text style={styles.submitButtonText}>Cancel Event</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms Notice */}
        <View style={styles.termsNotice}>
          <Text style={styles.termsText}>
            By cancelling this event, you acknowledge that you have read and agree to our 
            contractor cancellation policies. Cancellations within 12 hours result in immediate 
            account suspension. Appeals must be submitted to support@revovend.com with valid 
            documentation.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  eventInfo: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  eventDateTime: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  criticalWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.error,
    alignItems: 'flex-start',
  },
  criticalWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: 4,
  },
  criticalWarningMessage: {
    fontSize: 14,
    color: theme.colors.error,
    lineHeight: 20,
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    alignItems: 'flex-start',
  },
  urgentWarning: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEF2F2',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.warning,
    marginBottom: 4,
  },
  urgentText: {
    color: theme.colors.error,
  },
  warningMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  penaltiesCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  penaltiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 12,
  },
  penaltyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  penaltyText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
    lineHeight: 20,
  },
  proofSection: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  proofTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  proofSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  proofWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  proofWarningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    marginLeft: 8,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  reasonInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.white,
  },
  termsNotice: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  suspendedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  suspendedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  suspendedMessage: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  suspensionDetails: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suspensionReason: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  appealEmail: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});