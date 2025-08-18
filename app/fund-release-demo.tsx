import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { DollarSign, AlertTriangle, CheckCircle, User } from 'lucide-react-native';

interface MockEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  contractorPay: number;
  foodStipend: number;
  vendors: {
    id: string;
    vendorName: string;
    contractorId: string;
    fundsReleased: boolean;
    stipendReleased: boolean;
  }[];
  businessOwnerId: string;
  eventHostId: string;
}

const mockEvent: MockEvent = {
  id: '1',
  title: 'Summer Food Festival',
  date: '2025-08-18',
  time: '14:00',
  contractorPay: 150,
  foodStipend: 25,
  vendors: [
    {
      id: 'v1',
      vendorName: 'John Smith',
      contractorId: 'c1',
      fundsReleased: false,
      stipendReleased: false,
    },
    {
      id: 'v2',
      vendorName: 'Sarah Johnson',
      contractorId: 'c2',
      fundsReleased: false,
      stipendReleased: true,
    },
  ],
  businessOwnerId: 'bo1',
  eventHostId: 'h1',
};

export default function FundReleaseDemo() {
  const [currentUserRole, setCurrentUserRole] = useState<'host' | 'business_owner'>('host');

  
  const releaseEscrowMutation = trpc.events.payments.releaseEscrowFunds.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        'Success',
        `Funds released successfully! Amount: $${data.amount}\nReleased at: ${new Date(data.releasedAt).toLocaleString()}\nEarly release: ${data.wasEarlyRelease ? 'Yes' : 'No'}`
      );
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const approveEarlyReleaseMutation = trpc.events.payments.approveEarlyRelease.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        'Early Release Approved',
        `Business owner approved early release!\nAmount: $${data.amount}\nApproved at: ${new Date(data.releasedAt).toLocaleString()}`
      );
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleReleaseFunds = (vendorId: string, amount: number, type: 'stipend' | 'final_payment') => {
    releaseEscrowMutation.mutate({
      eventId: mockEvent.id,
      vendorId,
      amount,
      type,
    });
  };

  const handleApproveEarlyRelease = (vendorId: string, amount: number, type: 'stipend' | 'final_payment') => {
    approveEarlyReleaseMutation.mutate({
      eventId: mockEvent.id,
      vendorId,
      amount,
      type,
      hostId: mockEvent.eventHostId,
    });
  };

  const getEventEndTime = () => {
    const eventDateTime = new Date(`${mockEvent.date} ${mockEvent.time}`);
    return new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000)); // 4 hour event
  };

  const getOneHourBeforeEnd = () => {
    const eventEndTime = getEventEndTime();
    return new Date(eventEndTime.getTime() - (60 * 60 * 1000));
  };

  const isEarlyRelease = () => {
    const now = new Date();
    const oneHourBeforeEnd = getOneHourBeforeEnd();
    return now < oneHourBeforeEnd;
  };

  const getTimeUntilRelease = () => {
    const now = new Date();
    const oneHourBeforeEnd = getOneHourBeforeEnd();
    const diff = oneHourBeforeEnd.getTime() - now.getTime();
    
    if (diff <= 0) return 'Funds can be released now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m until funds can be released`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Fund Release System Demo',
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Role Selector */}
        <View style={styles.roleSelector}>
          <Text style={styles.sectionTitle}>Current User Role</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, currentUserRole === 'host' && styles.activeRole]}
              onPress={() => setCurrentUserRole('host')}
            >
              <User size={20} color={currentUserRole === 'host' ? '#fff' : '#6366f1'} />
              <Text style={[styles.roleText, currentUserRole === 'host' && styles.activeRoleText]}>Host</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, currentUserRole === 'business_owner' && styles.activeRole]}
              onPress={() => setCurrentUserRole('business_owner')}
            >
              <User size={20} color={currentUserRole === 'business_owner' ? '#fff' : '#6366f1'} />
              <Text style={[styles.roleText, currentUserRole === 'business_owner' && styles.activeRoleText]}>Business Owner</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{mockEvent.title}</Text>
          <Text style={styles.eventDate}>{new Date(`${mockEvent.date} ${mockEvent.time}`).toLocaleString()}</Text>
          <Text style={styles.eventEndTime}>Event ends: {getEventEndTime().toLocaleString()}</Text>
        </View>

        {/* Time Restriction Info */}
        <View style={[styles.infoCard, isEarlyRelease() ? styles.warningCard : styles.successCard]}>
          <View style={styles.infoHeader}>
            {isEarlyRelease() ? (
              <AlertTriangle size={24} color="#f59e0b" />
            ) : (
              <CheckCircle size={24} color="#10b981" />
            )}
            <Text style={styles.infoTitle}>
              {isEarlyRelease() ? 'Early Release Restriction' : 'Funds Can Be Released'}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {isEarlyRelease() 
              ? `Funds cannot be released more than 1 hour before event end. ${getTimeUntilRelease()}.`
              : 'Funds can now be released without restrictions.'
            }
          </Text>
          {isEarlyRelease() && (
            <Text style={styles.infoSubtext}>
              Business owners can override this restriction, and hosts&apos; early release requests will notify the business owner.
            </Text>
          )}
        </View>

        {/* Fund Release Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>Fund Release Rules</Text>
          <View style={styles.rule}>
            <Text style={styles.ruleNumber}>1.</Text>
            <Text style={styles.ruleText}>Hosts cannot release funds more than 1 hour before event end</Text>
          </View>
          <View style={styles.rule}>
            <Text style={styles.ruleNumber}>2.</Text>
            <Text style={styles.ruleText}>Early release attempts by hosts notify the business owner</Text>
          </View>
          <View style={styles.rule}>
            <Text style={styles.ruleNumber}>3.</Text>
            <Text style={styles.ruleText}>Business owners can approve early releases at any time</Text>
          </View>
          <View style={styles.rule}>
            <Text style={styles.ruleNumber}>4.</Text>
            <Text style={styles.ruleText}>All fund releases are tracked with timestamps and user IDs</Text>
          </View>
        </View>

        {/* Vendors List */}
        <View style={styles.vendorsCard}>
          <Text style={styles.sectionTitle}>Contractors & Fund Release</Text>
          {mockEvent.vendors.map((vendor) => (
            <View key={vendor.id} style={styles.vendorItem}>
              <View style={styles.vendorHeader}>
                <Text style={styles.vendorName}>{vendor.vendorName}</Text>
                <Text style={styles.vendorId}>ID: {vendor.contractorId}</Text>
              </View>
              
              <View style={styles.fundActions}>
                {/* Stipend Release */}
                <View style={styles.fundRow}>
                  <View style={styles.fundInfo}>
                    <DollarSign size={16} color="#6366f1" />
                    <Text style={styles.fundLabel}>Food Stipend: ${mockEvent.foodStipend}</Text>
                  </View>
                  {vendor.stipendReleased ? (
                    <View style={styles.releasedBadge}>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={styles.releasedText}>Released</Text>
                    </View>
                  ) : (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.releaseButton}
                        onPress={() => handleReleaseFunds(vendor.id, mockEvent.foodStipend, 'stipend')}
                        disabled={releaseEscrowMutation.isPending}
                      >
                        <Text style={styles.releaseButtonText}>
                          {currentUserRole === 'host' ? 'Request Release' : 'Release'}
                        </Text>
                      </TouchableOpacity>
                      {currentUserRole === 'business_owner' && isEarlyRelease() && (
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleApproveEarlyRelease(vendor.id, mockEvent.foodStipend, 'stipend')}
                          disabled={approveEarlyReleaseMutation.isPending}
                        >
                          <Text style={styles.approveButtonText}>Force Release</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Final Payment Release */}
                <View style={styles.fundRow}>
                  <View style={styles.fundInfo}>
                    <DollarSign size={16} color="#6366f1" />
                    <Text style={styles.fundLabel}>Final Payment: ${mockEvent.contractorPay}</Text>
                  </View>
                  {vendor.fundsReleased ? (
                    <View style={styles.releasedBadge}>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={styles.releasedText}>Released</Text>
                    </View>
                  ) : (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.releaseButton}
                        onPress={() => handleReleaseFunds(vendor.id, mockEvent.contractorPay, 'final_payment')}
                        disabled={releaseEscrowMutation.isPending}
                      >
                        <Text style={styles.releaseButtonText}>
                          {currentUserRole === 'host' ? 'Request Release' : 'Release'}
                        </Text>
                      </TouchableOpacity>
                      {currentUserRole === 'business_owner' && isEarlyRelease() && (
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleApproveEarlyRelease(vendor.id, mockEvent.contractorPay, 'final_payment')}
                          disabled={approveEarlyReleaseMutation.isPending}
                        >
                          <Text style={styles.approveButtonText}>Force Release</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  roleSelector: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366f1',
    backgroundColor: '#fff',
    gap: 8,
  },
  activeRole: {
    backgroundColor: '#6366f1',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6366f1',
  },
  activeRoleText: {
    color: '#fff',
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventEndTime: {
    fontSize: 14,
    color: '#9ca3af',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rulesCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  ruleNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    minWidth: 20,
  },
  ruleText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  vendorsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vendorItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    marginBottom: 16,
  },
  vendorHeader: {
    marginBottom: 12,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  vendorId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  fundActions: {
    gap: 12,
  },
  fundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fundLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  releasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  releasedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  releaseButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  releaseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});