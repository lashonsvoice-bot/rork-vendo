import React, { useState, useEffect } from 'react';
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
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { trpc, trpcClient } from '@/lib/trpc';

export default function SendExternalProposalScreen() {
  const router = useRouter();
  const { currentUser, userRole } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  
  const profileQuery = trpc.profile.get.useQuery(
    {},
    { enabled: !!currentUser && userRole === 'business_owner' }
  );
  
  const [formData, setFormData] = useState({
    eventTitle: '',
    eventDate: '',
    eventLocation: '',
    hostName: '',
    hostEmail: '',
    hostPhone: '',
    proposedAmount: '',
    contractorsNeeded: '',
    contactEmail: '',
    message: 'We would love to participate in your event with our experienced team of contractors. Our team is professional, reliable, and committed to making your event a success.',
  });

  const [sendResults, setSendResults] = useState<{
    success: boolean;
    emailSent: boolean;
    smsSent: boolean;
    proposalId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (profileQuery.data?.role === 'business_owner') {
      const businessProfile = profileQuery.data;
      if (businessProfile.contactEmail) {
        setFormData(prev => ({
          ...prev,
          contactEmail: businessProfile.contactEmail || ''
        }));
      }
    }
  }, [profileQuery.data]);

  const handleSendProposal = async () => {
    if (!currentUser || userRole !== 'business_owner') {
      Alert.alert('Error', 'You must be logged in as a business owner to send proposals');
      return;
    }

    // Validation
    const requiredFields = ['eventTitle', 'eventDate', 'eventLocation', 'hostName', 'proposedAmount', 'contractorsNeeded', 'message'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.hostEmail && !formData.hostPhone) {
      Alert.alert('Error', 'Please provide either an email address or phone number for the host');
      return;
    }

    const proposedAmount = parseFloat(formData.proposedAmount);
    const contractorsNeeded = parseInt(formData.contractorsNeeded);

    if (isNaN(proposedAmount) || proposedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid proposed amount');
      return;
    }

    if (isNaN(contractorsNeeded) || contractorsNeeded <= 0) {
      Alert.alert('Error', 'Please enter a valid number of contractors needed');
      return;
    }

    setIsLoading(true);

    try {
      const result = await trpcClient.proposals.sendExternal.mutate({
        businessOwnerId: currentUser.id,
        businessOwnerName: currentUser.name,
        businessName: (currentUser as any).businessName || 'My Business',
        businessOwnerContactEmail: formData.contactEmail || undefined,
        eventId: `external_${Date.now()}`,
        eventTitle: formData.eventTitle,
        hostName: formData.hostName,
        hostEmail: formData.hostEmail || undefined,
        hostPhone: formData.hostPhone || undefined,
        proposedAmount,
        contractorsNeeded,
        message: formData.message,
        eventDate: formData.eventDate,
        eventLocation: formData.eventLocation,
      });

      setSendResults(result);

      if (result.success) {
        Alert.alert(
          'Proposal Sent!',
          result.message,
          [
            { text: 'Send Another', style: 'default' },
            { text: 'Done', onPress: () => router.back(), style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error sending proposal:', error);
      Alert.alert('Error', 'Failed to send proposal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      eventTitle: '',
      eventDate: '',
      eventLocation: '',
      hostName: '',
      hostEmail: '',
      hostPhone: '',
      proposedAmount: '',
      contractorsNeeded: '',
      contactEmail: (profileQuery.data?.role === 'business_owner' ? profileQuery.data.contactEmail : '') || '',
      message: 'We would love to participate in your event with our experienced team of contractors. Our team is professional, reliable, and committed to making your event a success.',
    });
    setSendResults(null);
  };

  if (!currentUser || userRole !== 'business_owner') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Send External Proposal',
            headerStyle: { backgroundColor: '#8B5CF6' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }} 
        />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You must be logged in as a business owner to send external proposals.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
          title: 'Send External Proposal',
          headerStyle: { backgroundColor: '#8B5CF6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <Send size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>Send Proposal to External Host</Text>
          <Text style={styles.headerDescription}>
            Send a business proposal to event hosts who are not yet using the app via email and SMS.
          </Text>
        </View>

        {sendResults && (
          <View style={styles.resultsSection}>
            <View style={styles.resultHeader}>
              {sendResults.success ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <Text style={[styles.resultTitle, { color: sendResults.success ? '#10B981' : '#EF4444' }]}>
                {sendResults.success ? 'Proposal Sent Successfully!' : 'Proposal Failed'}
              </Text>
            </View>
            
            <Text style={styles.resultMessage}>{sendResults.message}</Text>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultItem}>
                <Mail size={16} color={sendResults.emailSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.resultText, { color: sendResults.emailSent ? '#10B981' : '#9CA3AF' }]}>
                  Email: {sendResults.emailSent ? 'Sent' : 'Not sent'}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <MessageSquare size={16} color={sendResults.smsSent ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.resultText, { color: sendResults.smsSent ? '#10B981' : '#9CA3AF' }]}>
                  SMS: {sendResults.smsSent ? 'Sent' : 'Not sent'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
              <Text style={styles.resetButtonText}>Send Another Proposal</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Event Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.eventTitle}
              onChangeText={(text) => setFormData(prev => ({ ...prev, eventTitle: text }))}
              placeholder="Enter event title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.eventDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, eventDate: text }))}
              placeholder="e.g., March 15, 2024"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Location *</Text>
            <TextInput
              style={styles.input}
              value={formData.eventLocation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, eventLocation: text }))}
              placeholder="Enter event location"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Host Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Host Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.hostName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, hostName: text }))}
              placeholder="Enter host name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Host Email</Text>
            <TextInput
              style={styles.input}
              value={formData.hostEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, hostEmail: text }))}
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
              value={formData.hostPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, hostPhone: text }))}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Text style={styles.contactNote}>
            * Provide at least one contact method (email or phone)
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Business Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Contact Email</Text>
            <TextInput
              style={styles.input}
              value={formData.contactEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contactEmail: text }))}
              placeholder="your.email@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.contactNote}>
              This email will be used as the reply-to address for external communications
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Proposal Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Proposed Amount ($) *</Text>
            <TextInput
              style={styles.input}
              value={formData.proposedAmount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, proposedAmount: text }))}
              placeholder="500"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contractors Needed *</Text>
            <TextInput
              style={styles.input}
              value={formData.contractorsNeeded}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contractorsNeeded: text }))}
              placeholder="3"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="Enter your proposal message..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]} 
          onPress={handleSendProposal}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
          <Text style={styles.sendButtonText}>
            {isLoading ? 'Sending Proposal...' : 'Send Proposal'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Fill in the event and host contact information{'\n'}
            2. Enter your proposal details and message{'\n'}
            3. The system will send your proposal via:{'\n'}
               • Email (if email address provided){'\n'}
               • SMS (if phone number provided){'\n'}
            4. The host will receive information about downloading the app{'\n'}
            5. If they reply via email, it will go to your contact email{'\n'}
            6. Once they join the app, you can coordinate directly
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
    backgroundColor: '#EDE9FE',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    marginBottom: 16,
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
  resetButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  contactNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
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
});