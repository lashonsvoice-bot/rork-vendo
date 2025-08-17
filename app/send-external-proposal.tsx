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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { useEvents } from '@/hooks/events-store';
import { trpc, trpcClient } from '@/lib/trpc';

export default function SendExternalProposalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser, userRole } = useUser();
  const { markProposalSent } = useEvents();
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('[SendExternalProposal] Received params:', params);
  
  const profileQuery = trpc.profile.get.useQuery(
    {},
    { enabled: !!currentUser && userRole === 'business_owner' }
  );
  
  const [formData, setFormData] = useState({
    eventTitle: (params.eventTitle as string) || '',
    eventDate: (params.eventDate as string) || '',
    eventLocation: (params.eventLocation as string) || '',
    hostName: '',
    hostEmail: '',
    hostPhone: '',
    proposedAmount: (params.proposedAmount as string) || '',
    contactEmail: '',
    message: `Greetings,

[Insert business name] located in [insert city state] would like to RevoVend at your ${(params.eventTitle as string) || '[insert name and date of event]'}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.

We want to pay $[insert amount for table or booth and size] today as well as an additional fee of $[×.××] for you to ensure our contractors have materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.

If you accept this proposal please use the invitation code when you log into the RevoVend App. The more vendors see that you are a RevoVend Host the more your events could be filled remotely with vendors from all around the world.

Best regards,
[Your Name]
[Your Business Name]`,
  });

  const [sendResults, setSendResults] = useState<{
    success: boolean;
    emailSent: boolean;
    smsSent: boolean;
    proposalId: string;
    message: string;
    invitationCode?: string;
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
    const requiredFields = ['eventTitle', 'eventDate', 'eventLocation', 'hostName', 'proposedAmount', 'message'];
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

    if (isNaN(proposedAmount) || proposedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid proposed amount');
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
        message: formData.message,
        eventDate: formData.eventDate,
        eventLocation: formData.eventLocation,
      });

      setSendResults(result);

      if (result.success) {
        // Mark the original event as proposal sent if eventId is provided
        if (params.eventId) {
          try {
            markProposalSent(params.eventId as string);
            console.log('[SendExternalProposal] Marked proposal as sent for event:', params.eventId);
          } catch (error) {
            console.error('[SendExternalProposal] Failed to mark proposal as sent:', error);
          }
        }
        
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
      contactEmail: (profileQuery.data?.role === 'business_owner' ? profileQuery.data.contactEmail : '') || '',
      message: `Greetings,

[Insert business name] located in [insert city state] would like to RevoVend at your ${(params.eventTitle as string) || '[insert name and date of event]'}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.

We want to pay $[insert amount for table or booth and size] today as well as an additional fee of $[×.××] for you to ensure our contractors have materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.

If you accept this proposal please use the invitation code when you log into the RevoVend App. The more vendors see that you are a RevoVend Host the more your events could be filled remotely with vendors from all around the world.

Best regards,
[Your Name]
[Your Business Name]`,
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
            
            {sendResults.success && sendResults.invitationCode && (
              <View style={styles.invitationCodeSection}>
                <Text style={styles.invitationCodeLabel}>🔑 Host Invitation Code:</Text>
                <View style={styles.invitationCodeBox}>
                  <Text style={styles.invitationCodeText}>{sendResults.invitationCode}</Text>
                </View>
                <Text style={styles.invitationCodeNote}>
                  The host will use this code when they sign up to automatically connect to your proposal.
                  This code has been included in the email and SMS sent to the host.
                </Text>
              </View>
            )}
            
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
          <Text style={styles.sectionDescription}>
            Specify your table/booth requirements and what you&apos;re willing to invest in this remote vending opportunity.
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Table/Booth Investment ($) *</Text>
            <Text style={styles.inputHelper}>
              Amount you&apos;re willing to pay for table space, positioning, or booth rental
            </Text>
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
            <Text style={styles.inputLabel}>Proposal Message *</Text>
            <Text style={styles.inputHelper}>
              This is a default template that you can customize for each proposal. Edit the bracketed placeholders with your specific information.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="Enter your proposal message..."
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity 
              style={styles.resetTemplateButton}
              onPress={() => {
                const defaultTemplate = `Greetings,

[Insert business name] located in [insert city state] would like to RevoVend at your ${formData.eventTitle || '[insert name and date of event]'}. This means we are going to remotely vend at your event with trained professionals who will man our booth for us. We are reaching out to you in advance because we have researched the details of your event and believe your target market will be a great opportunity for both of us.

We want to pay $[insert amount for table or booth and size] today as well as an additional fee of $[×.××] for you to ensure our contractors have materials that we will send to an address you provide, arrive on time, and receive pay at the end of the event. Don't worry - other than receiving the materials everything is hands off, we just need your eyes.

If you accept this proposal please use the invitation code when you log into the RevoVend App. The more vendors see that you are a RevoVend Host the more your events could be filled remotely with vendors from all around the world.

Best regards,
[Your Name]
[Your Business Name]`;
                setFormData(prev => ({ ...prev, message: defaultTemplate }));
              }}
            >
              <Text style={styles.resetTemplateText}>Reset to Default Template</Text>
            </TouchableOpacity>
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
          <Text style={styles.infoTitle}>Remote Vending Process:</Text>
          <Text style={styles.infoText}>
            1. <Text style={styles.infoBold}>Submit Proposal:</Text> Send your booth/table request to event organizers{'\n'}
            2. <Text style={styles.infoBold}>Negotiation:</Text> Discuss space, positioning, and investment amount{'\n'}
            3. <Text style={styles.infoBold}>Agreement:</Text> Finalize terms and payment for table space{'\n'}
            4. <Text style={styles.infoBold}>Contractor Assignment:</Text> Hire and assign professional contractors{'\n'}
            5. <Text style={styles.infoBold}>Event Management:</Text> Your contractors handle setup, sales, and breakdown{'\n'}
            6. <Text style={styles.infoBold}>Remote Oversight:</Text> Monitor and manage your booth remotely through the app
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
    height: 200,
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
  infoBold: {
    fontWeight: '600',
  },
  inputHelper: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  resetTemplateButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  resetTemplateText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
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