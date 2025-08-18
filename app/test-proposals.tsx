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
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Search,
  Building2,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { trpc, trpcClient } from '@/lib/trpc';

export default function TestProposalsScreen() {
  const router = useRouter();
  const { currentUser, userRole } = useUser();
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'lookup'>('send');
  const [isLoading, setIsLoading] = useState(false);
  
  // Send External Proposal Form
  const [externalProposalForm, setExternalProposalForm] = useState({
    businessOwnerName: 'John Smith',
    businessName: 'Smith Crafts LLC',
    businessOwnerContactEmail: 'john@smithcrafts.com',
    eventTitle: 'Spring Craft Fair 2024',
    hostName: 'Sarah Johnson',
    hostEmail: 'sarah@springfair.com',
    hostPhone: '+1 (555) 123-4567',
    proposedAmount: 150,
    supervisoryFee: 25,
    contractorsNeeded: 2,
    message: 'We would love to have your business participate in our Spring Craft Fair. Your handmade items would be perfect for our audience.',
    eventDate: 'April 15, 2024',
    eventLocation: 'Downtown Community Center, Main St',
  });

  // Send Reverse Proposal Form
  const [reverseProposalForm, setReverseProposalForm] = useState({
    hostName: 'Mike Wilson',
    hostEmail: 'mike@summerfest.com',
    businessEmail: 'contact@artisangoods.com',
    businessPhone: '+1 (555) 987-6543',
    businessName: 'Artisan Goods Co',
    eventTitle: 'Summer Festival 2024',
    eventDate: 'July 20, 2024',
    eventLocation: 'City Park Pavilion',
    message: 'We believe your artisan products would be a great fit for our summer festival. We have over 2000 expected attendees.',
  });

  // Lookup Form
  const [lookupForm, setLookupForm] = useState({
    invitationCode: '',
  });

  const [results, setResults] = useState<any>(null);

  const handleSendExternalProposal = async () => {
    setIsLoading(true);
    try {
      const result = await trpcClient.proposals.sendExternal.mutate({
        businessOwnerId: 'external_business_' + Date.now(),
        ...externalProposalForm,
        eventId: 'test_event_' + Date.now(),
      });
      
      setResults({
        type: 'external',
        success: result.success,
        data: result,
      });
      
      Alert.alert(
        result.success ? 'Success!' : 'Error',
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending external proposal:', error);
      Alert.alert('Error', 'Failed to send external proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReverseProposal = async () => {
    setIsLoading(true);
    try {
      const result = await trpcClient.proposals.sendReverse.mutate({
        hostId: currentUser?.id || 'test_host_' + Date.now(),
        eventId: 'test_event_' + Date.now(),
        ...reverseProposalForm,
      });
      
      setResults({
        type: 'reverse',
        success: result.success,
        data: result,
      });
      
      Alert.alert(
        result.success ? 'Success!' : 'Error',
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending reverse proposal:', error);
      Alert.alert('Error', 'Failed to send reverse proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupProposal = async () => {
    if (!lookupForm.invitationCode.trim()) {
      Alert.alert('Error', 'Please enter an invitation code');
      return;
    }

    setIsLoading(true);
    try {
      // Try both external and reverse proposal lookups
      const [externalResult, reverseResult] = await Promise.all([
        trpcClient.proposals.findByCode.query({ invitationCode: lookupForm.invitationCode }),
        trpcClient.proposals.findReverseByCode.query({ invitationCode: lookupForm.invitationCode })
      ]);
      
      const foundResult = externalResult.found ? externalResult : reverseResult.found ? reverseResult : null;
      
      if (foundResult?.found) {
        setResults({
          type: 'lookup',
          success: true,
          data: foundResult,
        });
        Alert.alert('Found!', foundResult.message);
      } else {
        setResults({
          type: 'lookup',
          success: false,
          data: { message: 'Invitation code not found' },
        });
        Alert.alert('Not Found', 'Invitation code not found or expired');
      }
    } catch (error) {
      console.error('Error looking up proposal:', error);
      Alert.alert('Error', 'Failed to lookup proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSendExternalTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Send External Proposal</Text>
      <Text style={styles.tabDescription}>
        Test sending a proposal from a business owner to a host (external to the app)
      </Text>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Business Owner Info</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Owner Name</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.businessOwnerName}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, businessOwnerName: text }))}
            placeholder="Enter business owner name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.businessName}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, businessName: text }))}
            placeholder="Enter business name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Email</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.businessOwnerContactEmail}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, businessOwnerContactEmail: text }))}
            placeholder="Enter business email"
            keyboardType="email-address"
          />
        </View>
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Host Info</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Host Name</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.hostName}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, hostName: text }))}
            placeholder="Enter host name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Host Email</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.hostEmail}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, hostEmail: text }))}
            placeholder="Enter host email"
            keyboardType="email-address"
          />
        </View>
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.eventTitle}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, eventTitle: text }))}
            placeholder="Enter event title"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Proposed Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={externalProposalForm.proposedAmount.toString()}
            onChangeText={(text) => setExternalProposalForm(prev => ({ ...prev, proposedAmount: parseFloat(text) || 0 }))}
            placeholder="150"
            keyboardType="numeric"
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} 
        onPress={handleSendExternalProposal}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Send size={20} color="#FFFFFF" />
        )}
        <Text style={styles.actionButtonText}>
          {isLoading ? 'Sending...' : 'Send External Proposal'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSendReverseTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Send Reverse Proposal</Text>
      <Text style={styles.tabDescription}>
        Test sending a reverse proposal from a host to a business owner (external to the app)
      </Text>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Host Info</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Host Name</Text>
          <TextInput
            style={styles.input}
            value={reverseProposalForm.hostName}
            onChangeText={(text) => setReverseProposalForm(prev => ({ ...prev, hostName: text }))}
            placeholder="Enter host name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Host Email</Text>
          <TextInput
            style={styles.input}
            value={reverseProposalForm.hostEmail}
            onChangeText={(text) => setReverseProposalForm(prev => ({ ...prev, hostEmail: text }))}
            placeholder="Enter host email"
            keyboardType="email-address"
          />
        </View>
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Business Info</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Email</Text>
          <TextInput
            style={styles.input}
            value={reverseProposalForm.businessEmail}
            onChangeText={(text) => setReverseProposalForm(prev => ({ ...prev, businessEmail: text }))}
            placeholder="Enter business email"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name</Text>
          <TextInput
            style={styles.input}
            value={reverseProposalForm.businessName}
            onChangeText={(text) => setReverseProposalForm(prev => ({ ...prev, businessName: text }))}
            placeholder="Enter business name"
          />
        </View>
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={reverseProposalForm.eventTitle}
            onChangeText={(text) => setReverseProposalForm(prev => ({ ...prev, eventTitle: text }))}
            placeholder="Enter event title"
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} 
        onPress={handleSendReverseProposal}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <UserPlus size={20} color="#FFFFFF" />
        )}
        <Text style={styles.actionButtonText}>
          {isLoading ? 'Sending...' : 'Send Reverse Proposal'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLookupTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Lookup Proposal</Text>
      <Text style={styles.tabDescription}>
        Test looking up a proposal by invitation code
      </Text>
      
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Invitation Code</Text>
          <TextInput
            style={styles.input}
            value={lookupForm.invitationCode}
            onChangeText={(text) => setLookupForm(prev => ({ ...prev, invitationCode: text }))}
            placeholder="Enter invitation code (e.g., HOST_1234567890_ABC123)"
            autoCapitalize="characters"
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]} 
        onPress={handleLookupProposal}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Search size={20} color="#FFFFFF" />
        )}
        <Text style={styles.actionButtonText}>
          {isLoading ? 'Looking up...' : 'Lookup Proposal'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultHeader}>
          {results.success ? (
            <CheckCircle size={24} color="#10B981" />
          ) : (
            <AlertCircle size={24} color="#EF4444" />
          )}
          <Text style={[styles.resultTitle, { color: results.success ? '#10B981' : '#EF4444' }]}>
            {results.success ? 'Success!' : 'Failed'}
          </Text>
        </View>
        
        <Text style={styles.resultMessage}>
          {results.data.message || 'Operation completed'}
        </Text>
        
        {results.success && results.data.invitationCode && (
          <View style={styles.invitationCodeSection}>
            <Text style={styles.invitationCodeLabel}>🔑 Invitation Code:</Text>
            <View style={styles.invitationCodeBox}>
              <Text style={styles.invitationCodeText}>{results.data.invitationCode}</Text>
            </View>
            <Text style={styles.invitationCodeNote}>
              Use this code in the lookup tab to test the proposal system
            </Text>
          </View>
        )}
        
        {results.data.emailSent !== undefined && (
          <View style={styles.resultDetails}>
            <View style={styles.resultItem}>
              <Mail size={16} color={results.data.emailSent ? '#10B981' : '#9CA3AF'} />
              <Text style={[styles.resultText, { color: results.data.emailSent ? '#10B981' : '#9CA3AF' }]}>
                Email: {results.data.emailSent ? 'Sent' : 'Not sent'}
              </Text>
            </View>
            
            <View style={styles.resultItem}>
              <MessageSquare size={16} color={results.data.smsSent ? '#10B981' : '#9CA3AF'} />
              <Text style={[styles.resultText, { color: results.data.smsSent ? '#10B981' : '#9CA3AF' }]}>
                SMS: {results.data.smsSent ? 'Sent' : 'Not sent'}
              </Text>
            </View>
          </View>
        )}
        
        {results.type === 'lookup' && results.success && results.data.proposal && (
          <View style={styles.proposalDetails}>
            <Text style={styles.proposalDetailsTitle}>Proposal Details:</Text>
            <Text style={styles.proposalDetailsText}>
              {JSON.stringify(results.data.proposal, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Test Proposals',
          headerStyle: { backgroundColor: '#10B981' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Send size={20} color={activeTab === 'send' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>Send External</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'receive' && styles.activeTab]}
          onPress={() => setActiveTab('receive')}
        >
          <UserPlus size={20} color={activeTab === 'receive' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'receive' && styles.activeTabText]}>Send Reverse</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'lookup' && styles.activeTab]}
          onPress={() => setActiveTab('lookup')}
        >
          <Search size={20} color={activeTab === 'lookup' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'lookup' && styles.activeTabText]}>Lookup</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'send' && renderSendExternalTab()}
        {activeTab === 'receive' && renderSendReverseTab()}
        {activeTab === 'lookup' && renderLookupTab()}
        
        {renderResults()}
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to Test:</Text>
          <Text style={styles.infoText}>
            1. <Text style={styles.infoBold}>Send External:</Text> Test business owner sending proposal to host{'\n'}
            2. <Text style={styles.infoBold}>Send Reverse:</Text> Test host inviting business owner{'\n'}
            3. <Text style={styles.infoBold}>Lookup:</Text> Use invitation codes from sent proposals to test lookup{'\n'}
            4. <Text style={styles.infoBold}>Check Console:</Text> View detailed logs in the console for debugging
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#10B981',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  tabDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
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
  actionButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 1,
  },
  invitationCodeNote: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    textAlign: 'center',
  },
  proposalDetails: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  proposalDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  proposalDetailsText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
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
});