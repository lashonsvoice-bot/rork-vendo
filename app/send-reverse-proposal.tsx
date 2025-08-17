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
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  UserPlus,
} from 'lucide-react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { trpc, trpcClient } from '@/lib/trpc';

export default function SendReverseProposalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser, userRole } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('[SendReverseProposal] Received params:', params);
  
  const profileQuery = trpc.profile.get.useQuery(
    {},
    { enabled: !!currentUser && userRole === 'event_host' }
  );
  
  const [formData, setFormData] = useState({
    eventTitle: (params.eventTitle as string) || '',
    eventDate: (params.eventDate as string) || '',
    eventLocation: (params.eventLocation as string) || '',
    businessOwnerName: (params.businessOwnerName as string) || '',
    businessName: (params.businessName as string) || '',
    businessOwnerEmail: (params.businessOwnerEmail as string) || '',
    businessOwnerPhone: (params.businessOwnerPhone as string) || '',
    hostContactEmail: '',
    tableSpaceOffered: '',
    managementFee: '',
    expectedAttendees: '',
    message: `Greetings [Business Owner Name],

I hope this message finds you well! I'm [Host Name], and I'm hosting [Event Title] on [Event Date] in [Event Location]. After researching your business, [Business Name], I believe your products/services would be a perfect fit for our event attendees.

I'd like to invite you to participate as a remote vendor at our event. Here's what we're offering:

🏢 **Event Details:**
• Event: [Event Title]
• Date: [Event Date]
• Location: [Event Location]
• Expected Attendees: [Expected Attendees]

💼 **What We're Offering:**
• Table/Booth Space: [Table Space Details]
• Management Fee: $[Management Fee] (for overseeing your contractors and ensuring smooth operations)
• Professional oversight of your remote vending setup
• Direct communication throughout the event

📋 **How Remote Vending Works:**
1. You hire and assign professional contractors through RevoVend
2. You ship your materials to our provided address
3. We ensure your contractors arrive on time and are properly set up
4. Your contractors handle sales and customer interactions
5. We oversee the process and provide updates
6. Payment is released to contractors at the end of the event

I'm excited about the possibility of having [Business Name] as part of our event. Remote vending allows you to expand your market reach without the travel costs and time commitment of traditional vending.

Best regards,
[Host Name]
Event Host - [Event Title]`,
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
    if (profileQuery.data?.role === 'event_host') {
      const hostProfile = profileQuery.data;
      if (hostProfile.user.email) {
        setFormData(prev => ({
          ...prev,
          hostContactEmail: hostProfile.user.email || ''
        }));
      }
    }
  }, [profileQuery.data]);

  const handleSendReverseProposal = async () => {
    if (!currentUser || userRole !== 'event_host') {
      Alert.alert('Error', 'You must be logged in as an event host to send reverse proposals');
      return;
    }

    // Validation
    const requiredFields = ['eventTitle', 'eventDate', 'eventLocation', 'businessOwnerName', 'businessName', 'tableSpaceOffered', 'managementFee', 'expectedAttendees', 'message'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.businessOwnerEmail && !formData.businessOwnerPhone) {
      Alert.alert('Error', 'Please provide either an email address or phone number for the business owner');
      return;
    }

    const managementFee = parseFloat(formData.managementFee);

    if (isNaN(managementFee) || managementFee < 0) {
      Alert.alert('Error', 'Please enter a valid management fee (can be 0)');
      return;
    }

    setIsLoading(true);

    try {
      const result = await trpcClient.proposals.sendReverseExternal.mutate({
        hostId: currentUser.id,
        hostName: currentUser.name,
        eventId: (params.eventId as string) || `event_${Date.now()}`,
        eventTitle: formData.eventTitle,
        eventDate: formData.eventDate,
        eventLocation: formData.eventLocation,
        businessOwnerName: formData.businessOwnerName,
        businessName: formData.businessName,
        businessOwnerEmail: formData.businessOwnerEmail || undefined,
        businessOwnerPhone: formData.businessOwnerPhone || undefined,
        hostContactEmail: formData.hostContactEmail || undefined,
        tableSpaceOffered: formData.tableSpaceOffered,
        managementFee,
        expectedAttendees: formData.expectedAttendees,
        message: formData.message,
      });

      setSendResults(result);

      if (result.success) {
        Alert.alert(
          'Reverse Proposal Sent!',
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
      console.error('Error sending reverse proposal:', error);
      Alert.alert('Error', 'Failed to send reverse proposal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      eventTitle: '',
      eventDate: '',
      eventLocation: '',
      businessOwnerName: '',
      businessName: '',
      businessOwnerEmail: '',
      businessOwnerPhone: '',
      hostContactEmail: (profileQuery.data?.role === 'event_host' ? profileQuery.data.user.email : '') || '',
      tableSpaceOffered: '',
      managementFee: '',
      expectedAttendees: '',
      message: `Greetings [Business Owner Name],

I hope this message finds you well! I'm [Host Name], and I'm hosting [Event Title] on [Event Date] in [Event Location]. After researching your business, [Business Name], I believe your products/services would be a perfect fit for our event attendees.

I'd like to invite you to participate as a remote vendor at our event. Here's what we're offering:

🏢 **Event Details:**
• Event: [Event Title]
• Date: [Event Date]
• Location: [Event Location]
• Expected Attendees: [Expected Attendees]

💼 **What We're Offering:**
• Table/Booth Space: [Table Space Details]
• Management Fee: $[Management Fee] (for overseeing your contractors and ensuring smooth operations)
• Professional oversight of your remote vending setup
• Direct communication throughout the event

📋 **How Remote Vending Works:**
1. You hire and assign professional contractors through RevoVend
2. You ship your materials to our provided address
3. We ensure your contractors arrive on time and are properly set up
4. Your contractors handle sales and customer interactions
5. We oversee the process and provide updates
6. Payment is released to contractors at the end of the event

I'm excited about the possibility of having [Business Name] as part of our event. Remote vending allows you to expand your market reach without the travel costs and time commitment of traditional vending.

Best regards,
[Host Name]
Event Host - [Event Title]`,
    });
    setSendResults(null);
  };

  if (!currentUser || userRole !== 'event_host') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Invite Business Owner',
            headerStyle: { backgroundColor: '#10B981' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }} 
        />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You must be logged in as an event host to send reverse proposals.
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
          title: 'Invite Business Owner',
          headerStyle: { backgroundColor: '#10B981' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <UserPlus size={32} color="#10B981" />
          </View>
          <Text style={styles.headerTitle}>Invite Business Owner to Remote Vend</Text>
          <Text style={styles.headerDescription}>
            Send an invitation to business owners who are not yet using the app to participate as remote vendors at your event.
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
                {sendResults.success ? 'Invitation Sent Successfully!' : 'Invitation Failed'}
              </Text>
            </View>
            
            <Text style={styles.resultMessage}>{sendResults.message}</Text>
            
            {sendResults.success && sendResults.invitationCode && (
              <View style={styles.invitationCodeSection}>
                <Text style={styles.invitationCodeLabel}>🔑 Business Owner Invitation Code:</Text>
                <View style={styles.invitationCodeBox}>
                  <Text style={styles.invitationCodeText}>{sendResults.invitationCode}</Text>
                </View>
                <Text style={styles.invitationCodeNote}>
                  The business owner will use this code when they sign up to automatically connect to your event invitation.
                  This code has been included in the email and SMS sent to the business owner.
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
              <Text style={styles.resetButtonText}>Send Another Invitation</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected Attendees *</Text>
            <Text style={styles.inputHelper}>
              Provide the number or range of expected attendees to help the business owner understand the opportunity
            </Text>
            <TextInput
              style={styles.input}
              value={formData.expectedAttendees}
              onChangeText={(text) => setFormData(prev => ({ ...prev, expectedAttendees: text }))}
              placeholder="e.g., 500-1000 attendees, 2500+ professionals"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Business Owner Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Owner Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.businessOwnerName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, businessOwnerName: text }))}
              placeholder="Enter business owner name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
              placeholder="Enter business name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Owner Email</Text>
            <TextInput
              style={styles.input}
              value={formData.businessOwnerEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, businessOwnerEmail: text }))}
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
              value={formData.businessOwnerPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, businessOwnerPhone: text }))}
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
          <Text style={styles.sectionTitle}>Host Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Contact Email</Text>
            <TextInput
              style={styles.input}
              value={formData.hostContactEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, hostContactEmail: text }))}
              placeholder="your.email@host.com"
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
          <Text style={styles.sectionTitle}>Offer Details</Text>
          <Text style={styles.sectionDescription}>
            Specify what you&apos;re offering to the business owner for remote vending at your event.
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Table/Booth Space Offered *</Text>
            <Text style={styles.inputHelper}>
              Describe the table/booth space, size, location, or any special features
            </Text>
            <TextInput
              style={styles.input}
              value={formData.tableSpaceOffered}
              onChangeText={(text) => setFormData(prev => ({ ...prev, tableSpaceOffered: text }))}
              placeholder="e.g., 8x10 booth in main hall, premium location near entrance"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Management Fee ($) *</Text>
            <Text style={styles.inputHelper}>
              Fee you&apos;ll charge for overseeing their contractors and managing the booth (can be 0)
            </Text>
            <TextInput
              style={styles.input}
              value={formData.managementFee}
              onChangeText={(text) => setFormData(prev => ({ ...prev, managementFee: text }))}
              placeholder="50"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Invitation Message *</Text>
            <Text style={styles.inputHelper}>
              This is a default template that you can customize for each invitation. Edit the bracketed placeholders with your specific information.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="Enter your invitation message..."
              multiline
              numberOfLines={15}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity 
              style={styles.resetTemplateButton}
              onPress={() => {
                const defaultTemplate = `Greetings ${formData.businessOwnerName || '[Business Owner Name]'},

I hope this message finds you well! I'm ${currentUser?.name || '[Host Name]'}, and I'm hosting ${formData.eventTitle || '[Event Title]'} on ${formData.eventDate || '[Event Date]'} in ${formData.eventLocation || '[Event Location]'}. After researching your business, ${formData.businessName || '[Business Name]'}, I believe your products/services would be a perfect fit for our event attendees.

I'd like to invite you to participate as a remote vendor at our event. Here's what we're offering:

🏢 **Event Details:**
• Event: ${formData.eventTitle || '[Event Title]'}
• Date: ${formData.eventDate || '[Event Date]'}
• Location: ${formData.eventLocation || '[Event Location]'}
• Expected Attendees: ${formData.expectedAttendees || '[Expected Attendees]'}

💼 **What We're Offering:**
• Table/Booth Space: ${formData.tableSpaceOffered || '[Table Space Details]'}
• Management Fee: ${formData.managementFee || '[Management Fee]'} (for overseeing your contractors and ensuring smooth operations)
• Professional oversight of your remote vending setup
• Direct communication throughout the event

📋 **How Remote Vending Works:**
1. You hire and assign professional contractors through RevoVend
2. You ship your materials to our provided address
3. We ensure your contractors arrive on time and are properly set up
4. Your contractors handle sales and customer interactions
5. We oversee the process and provide updates
6. Payment is released to contractors at the end of the event

I'm excited about the possibility of having ${formData.businessName || '[Business Name]'} as part of our event. Remote vending allows you to expand your market reach without the travel costs and time commitment of traditional vending.

Best regards,
${currentUser?.name || '[Host Name]'}
Event Host - ${formData.eventTitle || '[Event Title]'}`;
                setFormData(prev => ({ ...prev, message: defaultTemplate }));
              }}
            >
              <Text style={styles.resetTemplateText}>Reset to Default Template</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]} 
          onPress={handleSendReverseProposal}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <UserPlus size={20} color="#FFFFFF" />
          )}
          <Text style={styles.sendButtonText}>
            {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Host Benefits of Remote Vending:</Text>
          <Text style={styles.infoText}>
            1. <Text style={styles.infoBold}>Expand Vendor Pool:</Text> Access businesses from anywhere in the world{'\n'}
            2. <Text style={styles.infoBold}>Reduced Logistics:</Text> Vendors handle their own contractor management{'\n'}
            3. <Text style={styles.infoBold}>Management Fee:</Text> Earn additional revenue for overseeing remote vendors{'\n'}
            4. <Text style={styles.infoBold}>Professional Service:</Text> RevoVend-trained contractors ensure quality{'\n'}
            5. <Text style={styles.infoBold}>Event Enhancement:</Text> Unique products and services from distant markets{'\n'}
            6. <Text style={styles.infoBold}>Minimal Risk:</Text> Vendors pay upfront and handle their own inventory
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
    backgroundColor: '#D1FAE5',
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
    backgroundColor: '#10B981',
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
    height: 250,
    textAlignVertical: 'top',
  },
  contactNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  sendButton: {
    backgroundColor: '#10B981',
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
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#047857',
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