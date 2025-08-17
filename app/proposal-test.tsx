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
} from 'react-native';
import { 
  Send, 
  User,
  Building2,
  Store,
  CheckCircle,
  Clock,
  Mail,
  ArrowRight,
  TestTube,
  ExternalLink
} from 'lucide-react-native';
import { useCommunication } from '@/hooks/communication-store';
import { useUser } from '@/hooks/user-store';
import { useEvents } from '@/hooks/events-store';
import { Stack, useRouter } from 'expo-router';

export default function ProposalTestScreen() {
  const router = useRouter();
  const { currentUser, userRole, businessOwners, eventHosts } = useUser();
  const { events } = useEvents();
  const { 
    createBusinessProposal,
    getMessagesForUser,
    getProposalsForUser,
    getPendingEmailNotifications,
    getEmailNotificationHistory
  } = useCommunication();
  
  const [testForm, setTestForm] = useState({
    eventId: '',
    proposedAmount: '500',
    contractorsNeeded: '3',
    message: 'We would love to participate in your event with our experienced team of contractors.'
  });
  
  const [testResults, setTestResults] = useState<any>(null);

  // Get available events for testing
  const availableEvents = events.filter(event => 
    event.createdBy === 'event_host' && 
    event.status === 'active'
  );

  const handleSendTestProposal = () => {
    if (!currentUser || userRole !== 'business_owner') {
      Alert.alert('Error', 'You must be logged in as a business owner to send proposals');
      return;
    }

    if (!testForm.eventId || !testForm.proposedAmount || !testForm.contractorsNeeded || !testForm.message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const selectedEvent = events.find(e => e.id === testForm.eventId);
    if (!selectedEvent) {
      Alert.alert('Error', 'Selected event not found');
      return;
    }

    // Find the event host
    const eventHost = eventHosts.find(h => h.id === selectedEvent.eventHostId);
    
    const proposalData = {
      businessOwnerId: currentUser.id,
      businessOwnerName: currentUser.name,
      businessName: (currentUser as any).businessName || 'Test Business',
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      eventHostId: selectedEvent.eventHostId || 'unknown-host',
      eventHostName: selectedEvent.eventHostName || eventHost?.name || 'Unknown Host',
      eventHostEmail: eventHost?.email, // This will be undefined for registered hosts
      proposedAmount: parseInt(testForm.proposedAmount),
      contractorsNeeded: parseInt(testForm.contractorsNeeded),
      message: testForm.message,
    };

    console.log('🧪 SENDING TEST PROPOSAL:');
    console.log('Event Host Registered:', !!eventHost);
    console.log('Event Host Email:', eventHost?.email);
    console.log('Proposal Data:', proposalData);

    const proposal = createBusinessProposal(proposalData);
    
    // Capture test results
    const results = {
      proposalSent: true,
      proposalId: proposal.id,
      eventHostRegistered: !!eventHost,
      eventHostEmail: eventHost?.email,
      emailWillBeSent: !eventHost, // Email sent if host is not registered
      timestamp: new Date().toISOString()
    };
    
    setTestResults(results);
    
    Alert.alert(
      'Test Proposal Sent!', 
      `Proposal sent to ${proposalData.eventHostName}. Check the results below to see what happened.`
    );
  };

  const checkNotifications = () => {
    if (!currentUser) return;
    
    const messages = getMessagesForUser(currentUser.id);
    const proposals = getProposalsForUser(currentUser.id, 'business_owner');
    const pendingEmails = getPendingEmailNotifications();
    const emailHistory = getEmailNotificationHistory();
    
    console.log('📧 NOTIFICATION CHECK:');
    console.log('Messages for current user:', messages.length);
    console.log('Proposals for current user:', proposals.length);
    console.log('Pending emails:', pendingEmails.length);
    console.log('Email history:', emailHistory.length);
    
    Alert.alert(
      'Notification Status',
      `Messages: ${messages.length}\nProposals: ${proposals.length}\nPending Emails: ${pendingEmails.length}\nEmail History: ${emailHistory.length}\n\nCheck console for details.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Proposal Flow Test',
          headerStyle: { backgroundColor: '#8B5CF6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <TestTube size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>Proposal Flow Testing</Text>
          <Text style={styles.headerDescription}>
            Test how proposals are sent from business owners to event hosts and track the notification flow.
          </Text>
        </View>

        {!currentUser || userRole !== 'business_owner' ? (
          <View style={styles.errorSection}>
            <Text style={styles.errorText}>
              You must be logged in as a business owner to test proposals.
              Go to the Profile tab and switch to a business owner account.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.testSection}>
              <Text style={styles.sectionTitle}>Send Test Proposal</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Event</Text>
                <View style={styles.eventSelector}>
                  {availableEvents.length === 0 ? (
                    <Text style={styles.noEventsText}>No available events to test with</Text>
                  ) : (
                    availableEvents.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.eventOption,
                          testForm.eventId === event.id && styles.selectedEventOption
                        ]}
                        onPress={() => setTestForm(prev => ({ ...prev, eventId: event.id }))}
                      >
                        <View style={styles.eventOptionHeader}>
                          <Text style={styles.eventOptionTitle}>{event.title}</Text>
                          <View style={styles.hostInfo}>
                            <Store size={14} color="#F59E0B" />
                            <Text style={styles.hostName}>{event.eventHostName}</Text>
                          </View>
                        </View>
                        <Text style={styles.eventLocation}>{event.location}</Text>
                        <Text style={styles.eventDate}>{event.date} at {event.time}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Proposed Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={testForm.proposedAmount}
                  onChangeText={(text) => setTestForm(prev => ({ ...prev, proposedAmount: text }))}
                  placeholder="500"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contractors Needed</Text>
                <TextInput
                  style={styles.input}
                  value={testForm.contractorsNeeded}
                  onChangeText={(text) => setTestForm(prev => ({ ...prev, contractorsNeeded: text }))}
                  placeholder="3"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={testForm.message}
                  onChangeText={(text) => setTestForm(prev => ({ ...prev, message: text }))}
                  placeholder="Enter your proposal message..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleSendTestProposal}
                disabled={!testForm.eventId}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Test Proposal</Text>
              </TouchableOpacity>
            </View>

            {testResults && (
              <View style={styles.resultsSection}>
                <Text style={styles.sectionTitle}>Test Results</Text>
                
                <View style={styles.resultCard}>
                  <View style={styles.resultItem}>
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={styles.resultText}>Proposal sent successfully</Text>
                  </View>
                  
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Proposal ID:</Text>
                    <Text style={styles.resultValue}>{testResults.proposalId}</Text>
                  </View>
                  
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Event Host Status:</Text>
                    <Text style={[styles.resultValue, { color: testResults.eventHostRegistered ? '#10B981' : '#F59E0B' }]}>
                      {testResults.eventHostRegistered ? 'Registered User' : 'Unregistered User'}
                    </Text>
                  </View>
                  
                  {testResults.eventHostEmail && (
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Host Email:</Text>
                      <Text style={styles.resultValue}>{testResults.eventHostEmail}</Text>
                    </View>
                  )}
                  
                  <View style={styles.resultItem}>
                    <Mail size={16} color={testResults.emailWillBeSent ? '#F59E0B' : '#6B7280'} />
                    <Text style={[styles.resultText, { color: testResults.emailWillBeSent ? '#F59E0B' : '#6B7280' }]}>
                      {testResults.emailWillBeSent ? 'Email notification queued' : 'No email needed (registered user)'}
                    </Text>
                  </View>
                  
                  <View style={styles.resultItem}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={styles.resultText}>
                      {new Date(testResults.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.checkButton} onPress={checkNotifications}>
                <Mail size={20} color="#FFFFFF" />
                <Text style={styles.checkButtonText}>Check Notifications</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.messagesButton} 
                onPress={() => {
                  // Navigate to messages screen
                  Alert.alert('Info', 'Go to the Messages tab to see the proposal notifications');
                }}
              >
                <ArrowRight size={20} color="#8B5CF6" />
                <Text style={styles.messagesButtonText}>View Messages</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.externalProposalSection}>
              <Text style={styles.sectionTitle}>Send to External Hosts</Text>
              <Text style={styles.externalDescription}>
                Send proposals to event hosts who are not yet using the app via email and SMS.
              </Text>
              <TouchableOpacity 
                style={styles.externalButton} 
                onPress={() => router.push('/send-external-proposal' as any)}
              >
                <ExternalLink size={20} color="#FFFFFF" />
                <Text style={styles.externalButtonText}>Send External Proposal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>How it works:</Text>
              <Text style={styles.infoText}>
                1. Select an event hosted by an event host{"\n"}
                2. Fill in your proposal details{"\n"}
                3. Send the proposal{"\n"}
                4. The system will:{"\n"}
                   • Create a proposal record{"\n"}
                   • Send a message notification{"\n"}
                   • Queue an email if the host is unregistered{"\n"}
                5. Check the Messages tab to see the notifications{"\n"}
                6. Check console logs to see email notifications
              </Text>
            </View>
          </>
        )}
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
  },
  headerDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorSection: {
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 22,
  },
  testSection: {
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
    height: 100,
    textAlignVertical: 'top',
  },
  eventSelector: {
    gap: 8,
  },
  noEventsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  eventOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedEventOption: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
  },
  eventOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostName: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  resultCard: {
    gap: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  checkButton: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  messagesButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  messagesButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
  externalProposalSection: {
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
  externalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  externalButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  externalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});