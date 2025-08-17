import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, Plus, Mail, Phone, MapPin, ExternalLink, Send, Navigation } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';
import { theme } from '@/constants/theme';
import * as Location from 'expo-location';

interface BusinessDirectoryEntry {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  website?: string;
  location: string;
  isVerified: boolean;
  isRevoVendMember: boolean;
  addedBy: string;
  addedAt: string;
  invitationsSent: number;
  signupConversions: number;
}

export default function BusinessDirectoryScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDirectoryEntry | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [businessType, setBusinessType] = useState('');
  const [distanceResults, setDistanceResults] = useState<(BusinessDirectoryEntry & { distance: number })[]>([]);
  const [useDistanceFilter, setUseDistanceFilter] = useState(false);

  const [newBusiness, setNewBusiness] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    businessType: '',
    description: '',
    website: '',
    location: '',
    zipCode: '',
    state: '',
    city: '',
  });

  const businessesQuery = trpc.businessDirectory.getAll.useQuery();
  const eventsQuery = trpc.events.getAll.useQuery();
  const addBusinessMutation = trpc.businessDirectory.add.useMutation();
  const sendProposalMutation = trpc.businessDirectory.proposals.send.useMutation();


  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'web') {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => {
              console.log('Location error:', error);
            }
          );
        }
      } catch (error) {
        console.log('Web location error:', error);
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Native location error:', error);
      }
    }
  };

  const filteredBusinesses = useMemo(() => {
    if (useDistanceFilter && distanceResults.length > 0) {
      return distanceResults.filter(business => {
        const matchesSearch = !searchQuery || 
          business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.businessType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSearch;
      });
    }
    
    if (!businessesQuery.data) return [];
    
    return businessesQuery.data.filter(business => {
      const matchesSearch = !searchQuery || 
        business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.businessType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLocation = !locationFilter || 
        business.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
        business.zipCode?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        business.state?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        business.city?.toLowerCase().includes(locationFilter.toLowerCase());
      
      return matchesSearch && matchesLocation;
    });
  }, [businessesQuery.data, searchQuery, locationFilter, useDistanceFilter, distanceResults]);

  const handleAddBusiness = async () => {
    if (!newBusiness.businessName || !newBusiness.ownerName || !newBusiness.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await addBusinessMutation.mutateAsync({
        ...newBusiness,
        isVerified: false,
        isRevoVendMember: false,
      });
      
      setShowAddModal(false);
      setNewBusiness({
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        businessType: '',
        description: '',
        website: '',
        location: '',
        zipCode: '',
        state: '',
        city: '',
      });
      
      businessesQuery.refetch();
      Alert.alert('Success', 'Business added to directory');
    } catch {
      Alert.alert('Error', 'Failed to add business to directory');
    }
  };

  const handleSendInvite = async () => {
    if (!selectedBusiness || !selectedEventId) {
      Alert.alert('Error', 'Please select an event');
      return;
    }

    try {
      await sendProposalMutation.mutateAsync({
        businessId: selectedBusiness.id,
        eventId: selectedEventId,
        invitationCost: 1,
        emailSent: true,
        smsSent: true,
      });
      
      setShowInviteModal(false);
      setSelectedBusiness(null);
      setSelectedEventId('');
      
      Alert.alert(
        'Invitation Sent', 
        `Invitation sent to ${selectedBusiness.businessName}. You will be charged $1 for this invitation.`
      );
    } catch {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const openInviteModal = (business: BusinessDirectoryEntry) => {
    setSelectedBusiness(business);
    setShowInviteModal(true);
  };

  const handleDistanceSearch = async () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to search by distance.');
      return;
    }

    try {
      const response = await fetch('/api/trpc/businessDirectory.searchByDistance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            userLat: userLocation.latitude,
            userLon: userLocation.longitude,
            maxDistance,
            businessType: businessType || undefined,
          }
        })
      });
      
      const data = await response.json();
      const results = data.result?.data?.json || [];
      
      setDistanceResults(results);
      setUseDistanceFilter(true);
      setShowDistanceModal(false);
      
      Alert.alert(
        'Search Complete',
        `Found ${results.length} businesses within ${maxDistance} miles of your location.`
      );
    } catch {
      Alert.alert('Error', 'Failed to search businesses by distance');
    }
  };

  const clearDistanceFilter = () => {
    setUseDistanceFilter(false);
    setDistanceResults([]);
  };

  const distanceOptions = [5, 10, 25, 50, 100];

  // Allow guests to view directory but with limited functionality
  if (user?.role !== 'event_host' && user?.role !== 'business_owner' && user?.role !== 'guest') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Business Directory' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please log in to view the business directory.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Business Directory',
          headerRight: user?.role === 'event_host' ? () => (
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Plus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : undefined,
        }} 
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={theme.colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.text.secondary}
          />
        </View>
        
        <View style={styles.filterRow}>
          <TextInput
            style={[styles.locationInput, { flex: 1 }]}
            placeholder="Filter by location..."
            value={locationFilter}
            onChangeText={setLocationFilter}
            placeholderTextColor={theme.colors.text.secondary}
          />
          
          <TouchableOpacity 
            style={styles.distanceButton}
            onPress={() => setShowDistanceModal(true)}
          >
            <Navigation size={16} color={theme.colors.primary} />
            <Text style={styles.distanceButtonText}>Distance</Text>
          </TouchableOpacity>
        </View>
        
        {useDistanceFilter && (
          <View style={styles.activeFilterContainer}>
            <Text style={styles.activeFilterText}>
              Showing businesses within {maxDistance} miles
              {businessType && ` • ${businessType}`}
            </Text>
            <TouchableOpacity onPress={clearDistanceFilter}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.businessList}>
        {filteredBusinesses.map((business) => {
          const businessWithDistance = business as BusinessDirectoryEntry & { distance?: number };
          return (
          <View key={business.id} style={styles.businessCard}>
            <View style={styles.businessHeader}>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{business.businessName}</Text>
                <Text style={styles.ownerName}>{business.ownerName}</Text>
                <Text style={styles.businessType}>{business.businessType}</Text>
              </View>
              
              <View style={styles.statusContainer}>
                {business.isRevoVendMember && (
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberBadgeText}>Member</Text>
                  </View>
                )}
                {business.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.description}>{business.description}</Text>

            <View style={styles.contactInfo}>
              {/* Only show contact info to authenticated, non-guest users */}
              {user && user.role !== 'guest' && (
                <>
                  <View style={styles.contactItem}>
                    <Mail size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.contactText}>{business.email}</Text>
                  </View>
                  
                  <View style={styles.contactItem}>
                    <Phone size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.contactText}>{business.phone}</Text>
                  </View>
                  
                  {business.website && (
                    <View style={styles.contactItem}>
                      <ExternalLink size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.contactText}>{business.website}</Text>
                    </View>
                  )}
                </>
              )}
              
              <View style={styles.contactItem}>
                <MapPin size={16} color={theme.colors.text.secondary} />
                <Text style={styles.contactText}>{business.location}</Text>
                {businessWithDistance.distance && (
                  <Text style={styles.distanceText}> • {businessWithDistance.distance.toFixed(1)} mi</Text>
                )}
              </View>
              
              {!user || user.role === 'guest' ? (
                <View style={styles.guestContactNotice}>
                  <Text style={styles.guestContactNoticeText}>
                    Sign up to view contact information
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                Invitations: {business.invitationsSent} | Conversions: {business.signupConversions}
              </Text>
            </View>

            {user?.role === 'event_host' && (
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={() => openInviteModal(business)}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Send Invite ($1)</Text>
              </TouchableOpacity>
            )}
            
            {user?.role === 'guest' && (
              <TouchableOpacity 
                style={styles.guestSignUpButton}
                onPress={() => {
                  // Navigate to auth/signup
                  Alert.alert(
                    'Sign Up Required',
                    'Create an account to contact businesses and send invitations.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign Up', onPress: () => console.log('Navigate to signup') }
                    ]
                  );
                }}
              >
                <Text style={styles.guestSignUpButtonText}>Sign Up to Contact</Text>
              </TouchableOpacity>
            )}
          </View>
          );
        })}
      </ScrollView>

      {/* Add Business Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Business</Text>
            <TouchableOpacity onPress={handleAddBusiness}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.businessName}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, businessName: text }))}
                placeholder="Enter business name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Name *</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.ownerName}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, ownerName: text }))}
                placeholder="Enter owner name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.email}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.phone}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.businessType}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, businessType: text }))}
                placeholder="e.g., Restaurant, Retail, Service"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newBusiness.description}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, description: text }))}
                placeholder="Brief description of the business"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Website</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.website}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, website: text }))}
                placeholder="https://example.com"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.location}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, location: text }))}
                placeholder="Full address or City, State"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.city}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, city: text }))}
                placeholder="City"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.state}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, state: text }))}
                placeholder="State"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={newBusiness.zipCode}
                onChangeText={(text) => setNewBusiness(prev => ({ ...prev, zipCode: text }))}
                placeholder="ZIP Code"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Send Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send Invitation</Text>
            <TouchableOpacity onPress={handleSendInvite}>
              <Text style={styles.saveButton}>Send ($1)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedBusiness && (
              <View style={styles.selectedBusinessInfo}>
                <Text style={styles.selectedBusinessName}>{selectedBusiness.businessName}</Text>
                <Text style={styles.selectedBusinessOwner}>{selectedBusiness.ownerName}</Text>
                <Text style={styles.selectedBusinessEmail}>{selectedBusiness.email}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Event</Text>
              <ScrollView style={styles.eventsList}>
                {eventsQuery.data?.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventOption,
                      selectedEventId === event.id && styles.eventOptionSelected
                    ]}
                    onPress={() => setSelectedEventId(event.id)}
                  >
                    <Text style={[
                      styles.eventOptionText,
                      selectedEventId === event.id && styles.eventOptionTextSelected
                    ]}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventOptionDate}>
                      {new Date(event.date).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inviteInfo}>
              <Text style={styles.inviteInfoText}>
                This will send an email and SMS invitation to the business owner introducing your event and RevoVend. 
                You&apos;ll be charged $1 for this invitation, but receive $10 if they sign up as a new RevoVend member.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Distance Search Modal */}
      <Modal visible={showDistanceModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDistanceModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search by Distance</Text>
            <TouchableOpacity onPress={handleDistanceSearch}>
              <Text style={styles.saveButton}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {!userLocation && (
              <View style={styles.locationWarning}>
                <Navigation size={24} color={theme.colors.warning} />
                <Text style={styles.locationWarningText}>
                  Location access is required for distance-based search. Please enable location services.
                </Text>
                <TouchableOpacity 
                  style={styles.enableLocationButton}
                  onPress={requestLocationPermission}
                >
                  <Text style={styles.enableLocationButtonText}>Enable Location</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Maximum Distance (miles)</Text>
              <View style={styles.distanceOptionsContainer}>
                {distanceOptions.map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[
                      styles.distanceOption,
                      maxDistance === distance && styles.distanceOptionSelected
                    ]}
                    onPress={() => setMaxDistance(distance)}
                  >
                    <Text style={[
                      styles.distanceOptionText,
                      maxDistance === distance && styles.distanceOptionTextSelected
                    ]}>
                      {distance} mi
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Type (Optional)</Text>
              <TextInput
                style={styles.input}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="e.g., Restaurant, Retail, Service"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>

            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                This will search for businesses within your selected distance from your current location.
                {userLocation && (
                  ` Your location: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
                )}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  locationInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  businessList: {
    flex: 1,
    padding: 16,
  },
  businessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  businessType: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  memberBadge: {
    backgroundColor: theme.colors.green[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  memberBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statsContainer: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  saveButton: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectedBusinessInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedBusinessName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  selectedBusinessOwner: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  selectedBusinessEmail: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  eventsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventOptionSelected: {
    backgroundColor: theme.colors.primary + '20',
  },
  eventOptionText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  eventOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  eventOptionDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  inviteInfo: {
    backgroundColor: theme.colors.gold[100],
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  inviteInfoText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  distanceButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  activeFilterText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  locationWarning: {
    backgroundColor: theme.colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationWarningText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  enableLocationButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableLocationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  distanceOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  distanceOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  distanceOptionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  distanceOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchInfo: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  searchInfoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  guestContactNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  guestContactNoticeText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  guestSignUpButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  guestSignUpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});