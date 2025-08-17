import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { 
  Send,
  UserPlus,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  TestTube,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { trpcClient } from '@/lib/trpc';

export default function TestInvitationsScreen() {
  const { currentUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [testType, setTestType] = useState<'business_to_host' | 'host_to_business'>('business_to_host');
  
  // Business to Host test data
  const [businessToHostData, setBusinessToHostData] = useState({
    eventTitle: 'Tech Conference 2024',
    eventDate: 'March 15, 2024',
    eventLocation: 'Austin, TX',
    hostName: 'John Smith',
    hostEmail: '',
    hostPhone: '',
    proposedAmount: '500',
    contractorsNeeded: '2',
    message: 'Test proposal message from business owner to event host.',
  });

  // Host to Business test data
  const [hostToBusinessData, setHostToBusinessData] = useState({
    eventTitle: 'Spring Trade Show',
    eventDate: 'April 20, 2024',
    eventLocation: 'Dallas, TX',
    businessOwnerName: 'Jane Doe',
    businessName: 'Awesome Products LLC',
    businessOwnerEmail: '',
    businessOwnerPhone: '',
    tableSpaceOffered: '10x10 booth in premium location',
    managementFee: '75',
    message: 'Test invitation message from event host to business owner.',
  });

  const [testResults, setTestResults] = useState<{
    success: boolean;
    emailSent: boolean;
    smsSent: boolean;
    proposalId: string;
    message: string;
    invitationCode?: string;
    type: string;
  } | null>(null);

  const handleTestBusinessToHost = async () => {
    if (!businessToHostData.hostEmail && !businessToHostData.hostPhone) {
      Alert.alert('Error', 'Please provide either an email address or phone number for the host');
      return;
    }

    setIsLoading(true);
    try {
      const result = await trpcClient.proposals.sendExternal.mutate({
        businessOwnerId: currentUser?.id || 'test_business_owner',
        businessOwnerName: currentUser?.name || 'Test Business Owner',
        businessName: 'Test Business LLC',
        businessOwnerContactEmail: 'test@business.com',
        eventId: `test_event_${Date.now()}`,
        eventTitle: businessToHostData.eventTitle,
        hostName: businessToHostData.hostName,
        hostEmail: businessToHostData.hostEmail || undefined,
        hostPhone: businessToHostData.hostPhone || undefined,
        proposedAmount: parseFloat(businessToHostData.proposedAmount),
        contractorsNeeded: parseInt(businessToHostData.contractorsNeeded),
        message: businessToHostData.message,
        eventDate: businessToHostData.eventDate,
        eventLocation: businessToHostData.eventLocation,
      });

      setTestResults({ ...result, type: 'Business to Host' });
      
      if (result.success) {
        Alert.alert(
          'Test Successful!',
          `Business to Host invitation sent successfully!\n\nInvitation Code: ${result.invitationCode}\n\nEmail: ${result.emailSent ? 'Sent' : 'Not sent'}\nSMS: ${result.smsSent ? 'Sent' : 'Not sent'}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Test Failed', result.message);
      }
    } catch (error) {
      console.error('Error testing business to host invitation:', error);
      Alert.alert('Error', 'Failed to send test invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestHostToBusiness = async () => {
    if (!hostToBusinessData.businessOwnerEmail && !hostToBusinessData.businessOwnerPhone) {
      Alert.alert('Error', 'Please provide either an email address or phone number for the business owner');
      return;
    }

    setIsLoading(true);
    try {
      const result = await trpcClient.proposals.sendReverseExternal.mutate({
        hostId: currentUser?.id || 'test_host',
        hostName: currentUser?.name || 'Test Event Host',
        eventId: `test_event_${Date.now()}`,
        eventTitle: hostToBusinessData.eventTitle,
        eventDate: hostToBusinessData.eventDate,
        eventLocation: hostToBusinessData.eventLocation,
        businessOwnerName: hostToBusinessData.businessOwnerName,
        businessName: hostToBusinessData.businessName,
        businessOwnerEmail: hostToBusinessData.businessOwnerEmail || undefined,
        businessOwnerPhone: hostToBusinessData.businessOwnerPhone || undefined,
        hostContactEmail: 'test@host.com',
        tableSpaceOffered: hostToBusinessData.tableSpaceOffered,
        managementFee: parseFloat(hostToBusinessData.managementFee),
        message: hostToBusinessData.message,
      });

      setTestResults({ ...result, type: 'Host to Business' });
      
      if (result.success) {
        Alert.alert(
          'Test Successful!',
          `Host to Business invitation sent successfully!\n\nInvitation Code: ${result.invitationCode}\n\nEmail: ${result.emailSent ? 'Sent' : 'Not sent'}\nSMS: ${result.smsSent ? 'Sent' : 'Not sent'}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Test Failed', result.message);
      }
    } catch (error) {
      console.error('Error testing host to business invitation:', error);
      Alert.alert('Error', 'Failed to send test invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Test Invitations',
          headerStyle: { backgroundColor: '#F59E0B' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <TestTube size={32} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>Test Invitation System</Text>
          <Text style={styles.headerDescription}>
            Test the invitation system with real email addresses and phone numbers.
            This will send actual invitations with invitation codes.
          </Text>
        </View>

        <View style={styles.warningSection}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Important:</Text> Currently, the system simulates email and SMS sending by logging to the console. 
            To send real emails and SMS, you would need to integrate with services like SendGrid (email) and Twilio (SMS).
          </Text>
        </View>

        {testResults && (
          <View style={styles.resultsSection}>
            <View style={styles.resultHeader}>
              {testResults.success ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <Text style={[styles.resultTitle, { color: testResults.success ? '#10B981' : '#EF4444' }]}>
                {testResults.type} Test {testResults.success ? 'Successful!' : 'Failed'}
              </Text>
            </View>
            
            <Text style={styles.resultMessage}>{testResults.message}</Text>
            
            {testResults.success && testResults.invitationCode && (
              <View style={styles.invitationCodeSection}>
                <Text style={styles.invitationCodeLabel}>🔑 Generated Invitation Code:</Text>
                <View style={styles.invitationCodeBox}>
                  <Text style={styles.invitationCodeText}>{testResults.invitationCode}</Text>
                </View>
                <Text style={styles.invitationCodeNote}>
                  This code would be included in the email and SMS sent to the recipient.
                  They would use this code when signing up to automatically connect to the invitation.
                </Text>
              </View>
            )}
            
            <View style={styles.resultDetails}>
              <View style={styles.resultItem}>
                <Mail size={16} color={testResults.emailSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.resultText, { color: testResults.emailSent ? '#10B981' : '#9CA3AF' }]}>
                  Email: {testResults.emailSent ? 'Simulated (logged to console)' : 'Not sent'}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <MessageSquare size={16} color={testResults.smsSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.resultText, { color: testResults.smsSent ? '#10B981' : '#9CA3AF' }]}>
                  SMS: {testResults.smsSent ? 'Simulated (logged to console)' : 'Not sent'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Test Type Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.sectionTitle}>Select Test Type</Text>
          <View style={styles.selectorButtons}>
            <TouchableOpacity 
              style={[styles.selectorButton, testType === 'business_to_host' && styles.selectorButtonActive]}
              onPress={() => setTestType('business_to_host')}
            >
              <Send size={20} color={testType === 'business_to_host' ? '#FFFFFF' : '#8B5CF6'} />
              <Text style={[styles.selectorButtonText, testType === 'business_to_host' && styles.selectorButtonTextActive]}>
                Business → Host
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectorButton, testType === 'host_to_business' && styles.selectorButtonActive]}
              onPress={() => setTestType('host_to_business')}
            >
              <UserPlus size={20} color={testType === 'host_to_business' ? '#FFFFFF' : '#10B981'} />
              <Text style={[styles.selectorButtonText, testType === 'host_to_business' && styles.selectorButtonTextActive]}>
                Host → Business
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Business to Host Test Form */}
        {testType === 'business_to_host' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Business to Host Invitation Test</Text>
            <Text style={styles.sectionDescription}>
              Test sending a proposal from a business owner to an event host.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Host Email Address</Text>
              <TextInput
                style={styles.input}
                value={businessToHostData.hostEmail}
                onChangeText={(text) => setBusinessToHostData(prev => ({ ...prev, hostEmail: text }))}
                placeholder="host@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Host Phone Number</Text>
              <TextInput
                style={styles.input}
                value={businessToHostData.hostPhone}
                onChangeText={(text) => setBusinessToHostData(prev => ({ ...prev, hostPhone: text }))}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.contactNote}>
              * Provide at least one contact method (email or phone)
            </Text>

            <TouchableOpacity 
              style={[styles.testButton, styles.businessButton, isLoading && styles.testButtonDisabled]} 
              onPress={handleTestBusinessToHost}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={20} color="#FFFFFF" />
              )}
              <Text style={styles.testButtonText}>
                {isLoading ? 'Sending Test...' : 'Test Business → Host Invitation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Host to Business Test Form */}
        {testType === 'host_to_business' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Host to Business Invitation Test</Text>
            <Text style={styles.sectionDescription}>
              Test sending an invitation from an event host to a business owner.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Owner Email</Text>
              <TextInput
                style={styles.input}
                value={hostToBusinessData.businessOwnerEmail}
                onChangeText={(text) => setHostToBusinessData(prev => ({ ...prev, businessOwnerEmail: text }))}
                placeholder="owner@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Owner Phone</Text>
              <TextInput
                style={styles.input}
                value={hostToBusinessData.businessOwnerPhone}
                onChangeText={(text) => setHostToBusinessData(prev => ({ ...prev, businessOwnerPhone: text }))}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.contactNote}>
              * Provide at least one contact method (email or phone)
            </Text>

            <TouchableOpacity 
              style={[styles.testButton, styles.hostButton, isLoading && styles.testButtonDisabled]} 
              onPress={handleTestHostToBusiness}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <UserPlus size={20} color="#FFFFFF" />
              )}
              <Text style={styles.testButtonText}>
                {isLoading ? 'Sending Test...' : 'Test Host → Business Invitation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to Enable Real Email & SMS:</Text>
          <Text style={styles.infoText}>
            1. <Text style={styles.infoBold}>Email Service:</Text> Integrate with SendGrid, AWS SES, or similar{'\n'}
            2. <Text style={styles.infoBold}>SMS Service:</Text> Integrate with Twilio, AWS SNS, or similar{'\n'}
            3. <Text style={styles.infoBold}>Environment Variables:</Text> Add API keys to your environment{'\n'}
            4. <Text style={styles.infoBold}>Update Backend:</Text> Replace console.log with actual service calls{'\n'}
            5. <Text style={styles.infoBold}>Test Thoroughly:</Text> Verify deliverability and formatting
          </Text>
        </View>

        <View style={styles.consoleSection}>
          <Text style={styles.consoleTitle}>📋 Check Console Output</Text>
          <Text style={styles.consoleText}>
            When you run a test, check your browser&apos;s developer console or server logs to see the simulated email and SMS content that would be sent.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  warningSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  warningBold: {
    fontWeight: '600',
  },
  resultsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
  },
  resultDetails: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectorSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  selectorButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#8B5CF6',
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  selectorButtonTextActive: {
    color: '#FFFFFF',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  contactNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  businessButton: {
    backgroundColor: '#8B5CF6',
  },
  hostButton: {
    backgroundColor: '#10B981',
  },
  testButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
  consoleSection: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  consoleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  consoleText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  invitationCodeSection: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  invitationCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  invitationCodeBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  invitationCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 2,
  },
  invitationCodeNote: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    textAlign: 'center',
  },
});