import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { 
  AlertTriangle, 
  UserX,
  Clock,
  Send,
  X,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

export default function NoShowReportScreen() {
  const { 
    eventId, 
    contractorId, 
    contractorName, 
    eventTitle, 
    eventDate, 
    eventTime 
  } = useLocalSearchParams<{
    eventId: string;
    contractorId: string;
    contractorName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
  }>();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const reportNoShowMutation = trpc.events.cancellation.reportNoShow.useMutation();

  const handleReportNoShow = async () => {
    Alert.alert(
      'Confirm No-Show Report',
      `Are you sure ${contractorName} did not show up for this event? This will immediately suspend their account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report No-Show', 
          style: 'destructive',
          onPress: submitNoShowReport 
        },
      ]
    );
  };

  const submitNoShowReport = async () => {
    setIsSubmitting(true);
    
    try {
      await reportNoShowMutation.mutateAsync({
        eventId: eventId!,
        contractorId: contractorId!,
      });

      Alert.alert(
        'No-Show Reported', 
        `${contractorName} has been reported for not showing up. Their account has been suspended and they will receive a termination notice.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report no-show');
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventDateTime = new Date(`${eventDate} ${eventTime}`);
  const now = new Date();
  const hoursAfterEvent = Math.floor((now.getTime() - eventDateTime.getTime()) / (1000 * 60 * 60));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Report No-Show',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.eventDateTime}>
            {eventDateTime.toLocaleDateString()} at {eventTime}
          </Text>
          <Text style={styles.contractorName}>
            Contractor: {contractorName}
          </Text>
        </View>

        {/* Warning Section */}
        <View style={styles.warningCard}>
          <AlertTriangle size={24} color={theme.colors.error} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Serious Action Required</Text>
            <Text style={styles.warningMessage}>
              Reporting a no-show will immediately suspend the contractor&apos;s account. 
              This action cannot be undone without an appeal process.
            </Text>
          </View>
        </View>

        {/* Time Check */}
        <View style={styles.timeCard}>
          <Clock size={20} color={theme.colors.text.secondary} />
          <Text style={styles.timeText}>
            Event was {hoursAfterEvent > 0 ? `${hoursAfterEvent} hours ago` : 'scheduled for today'}
          </Text>
        </View>

        {/* Consequences */}
        <View style={styles.consequencesCard}>
          <Text style={styles.consequencesTitle}>Immediate Consequences</Text>
          
          <View style={styles.consequenceItem}>
            <UserX size={20} color={theme.colors.error} />
            <Text style={styles.consequenceText}>
              Contractor account will be immediately suspended
            </Text>
          </View>
          
          <View style={styles.consequenceItem}>
            <AlertTriangle size={20} color={theme.colors.error} />
            <Text style={styles.consequenceText}>
              Termination notice will be sent to contractor&apos;s email
            </Text>
          </View>
          
          <View style={styles.consequenceItem}>
            <Clock size={20} color={theme.colors.error} />
            <Text style={styles.consequenceText}>
              Contractor has 12 hours to provide legitimate excuse or face permanent termination
            </Text>
          </View>
        </View>

        {/* Appeal Process */}
        <View style={styles.appealCard}>
          <Text style={styles.appealTitle}>Appeal Process</Text>
          <Text style={styles.appealText}>
            The contractor can appeal this decision by providing non-HIPAA related materials 
            to prove hospitalization or other legitimate reasons for missing the event. 
            Appeals must be submitted to appeals@revovend.com within 12 hours.
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
            <Text style={styles.cancelButtonText}>Cancel Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportNoShow}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Send size={20} color={theme.colors.white} />
                <Text style={styles.reportButtonText}>Report No-Show</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms Notice */}
        <View style={styles.termsNotice}>
          <Text style={styles.termsText}>
            By reporting this no-show, you confirm that the contractor failed to appear 
            for the scheduled event without proper notice. False reports may result in 
            penalties to your account. RevoVend reserves the right to investigate all 
            no-show reports and take appropriate action.
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
    marginBottom: 8,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'flex-start',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  consequencesCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  consequencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 12,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  consequenceText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 8,
    lineHeight: 20,
  },
  appealCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  appealText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
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
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  reportButtonText: {
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
});