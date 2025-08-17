import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { 
  Search, 
  Building2,
  Store,
  MapPin,
  Calendar,
  Users,
  Filter,
  Clock,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/auth-store';
import { trpc, handleTRPCError } from '@/lib/trpc';
import { neonTheme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type DirectoryType = 'events' | 'businesses' | 'hosts' | 'venues';

export default function GuestDirectoriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDirectory, setSelectedDirectory] = useState<DirectoryType>('events');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Fetch public data (always call hooks)
  const publicEventsQuery = trpc.events.getPublicListings.useQuery();
  const businessOwnersQuery = trpc.profile.searchPublic.useQuery({
    role: 'business_owner',
    q: searchQuery || locationFilter || undefined,
    limit: 50,
  });
  const eventHostsQuery = trpc.profile.searchPublic.useQuery({
    role: 'event_host', 
    q: searchQuery || locationFilter || undefined,
    limit: 50,
  });

  const isLoading = publicEventsQuery.isLoading || businessOwnersQuery.isLoading || eventHostsQuery.isLoading;
  const hasError = publicEventsQuery.error || businessOwnersQuery.error || eventHostsQuery.error;

  React.useEffect(() => {
    if (hasError) {
      console.error('[GuestDirectories] Error:', hasError);
      Alert.alert('Error', handleTRPCError(hasError));
    }
  }, [hasError]);

  // Create event venues from events data
  const eventVenues = useMemo(() => {
    if (!publicEventsQuery.data) return [];
    
    const venuesMap = new Map();
    publicEventsQuery.data.forEach((event: any) => {
      const venueKey = `${event.location}-${event.city}-${event.state}`;
      if (!venuesMap.has(venueKey)) {
        venuesMap.set(venueKey, {
          id: venueKey,
          name: event.location,
          city: event.city,
          state: event.state,
          eventsCount: 1,
          lastEventDate: event.date,
          eventHostName: event.eventHostName,
          createdAt: event.createdAt || new Date().toISOString(),
        });
      } else {
        const venue = venuesMap.get(venueKey);
        venue.eventsCount += 1;
        if (new Date(event.date) > new Date(venue.lastEventDate)) {
          venue.lastEventDate = event.date;
          venue.eventHostName = event.eventHostName;
        }
      }
    });
    
    return Array.from(venuesMap.values());
  }, [publicEventsQuery.data]);

  // Filter data based on search and location
  const filteredData = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const locationLower = locationFilter.toLowerCase();
    
    const matchesSearch = (text: string) => !searchQuery || text.toLowerCase().includes(searchLower);
    const matchesLocation = (location: string) => !locationFilter || location.toLowerCase().includes(locationLower);
    
    switch (selectedDirectory) {
      case 'events':
        return (publicEventsQuery.data || []).filter((event: any) => 
          matchesSearch(`${event.title} ${event.description} ${event.businessName || ''}`) &&
          matchesLocation(`${event.city} ${event.state}`)
        );
      
      case 'businesses':
        return (businessOwnersQuery.data?.items || []).filter((business: any) => 
          matchesSearch(`${business.companyName || ''} ${business.description || ''}`) &&
          matchesLocation(business.location || '')
        );
      
      case 'hosts':
        return (eventHostsQuery.data?.items || []).filter((host: any) => 
          matchesSearch(`${host.organizationName || ''} ${host.bio || ''}`) &&
          matchesLocation(host.location || '')
        );
      
      case 'venues':
        return eventVenues.filter((venue: any) => 
          matchesSearch(`${venue.name} ${venue.eventHostName || ''}`) &&
          matchesLocation(`${venue.city} ${venue.state}`)
        );
      
      default:
        return [];
    }
  }, [selectedDirectory, searchQuery, locationFilter, publicEventsQuery.data, businessOwnersQuery.data, eventHostsQuery.data, eventVenues]);

  // Redirect non-guests after hooks
  if (user?.role !== 'guest') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Access Denied' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>This page is only available for guest users.</Text>
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signUpButtonText}>Sign Up for Full Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleRefresh = () => {
    publicEventsQuery.refetch();
    businessOwnersQuery.refetch();
    eventHostsQuery.refetch();
  };

  const directoryOptions = [
    { id: 'events' as DirectoryType, label: 'Public Events', icon: Calendar, count: publicEventsQuery.data?.length || 0 },
    { id: 'businesses' as DirectoryType, label: 'Business Directory', icon: Building2, count: businessOwnersQuery.data?.items?.length || 0 },
    { id: 'hosts' as DirectoryType, label: 'Event Hosts', icon: Users, count: eventHostsQuery.data?.items?.length || 0 },
    { id: 'venues' as DirectoryType, label: 'Event Venues', icon: Store, count: eventVenues.length },
  ];

  const renderEventCard = (event: any) => (
    <TouchableOpacity
      key={event.id}
      style={styles.itemCard}
      onPress={() => {
        Alert.alert(
          'Sign Up Required',
          'Create an account to view full event details and apply.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/auth') }
          ]
        );
      }}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.itemSubtitle}>{event.businessName || 'Business Event'}</Text>
        </View>
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>PUBLIC</Text>
        </View>
      </View>
      
      <View style={styles.publicInfo}>
        <View style={styles.publicInfoRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>{event.city}, {event.state}</Text>
        </View>
        <View style={styles.publicInfoRow}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>{new Date(event.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.publicInfoRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>Listed: {new Date(event.createdAt || Date.now()).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <Text style={styles.limitedAccessText}>
        Sign up to view full details, apply for positions, and contact organizers
      </Text>
    </TouchableOpacity>
  );

  const renderBusinessCard = (business: any) => (
    <TouchableOpacity
      key={business.id}
      style={styles.itemCard}
      onPress={() => {
        Alert.alert(
          'Sign Up Required',
          'Create an account to view full business profiles and contact information.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/auth') }
          ]
        );
      }}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{business.companyName || 'Business Owner'}</Text>
          <Text style={styles.itemSubtitle}>Business Owner</Text>
        </View>
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>PUBLIC</Text>
        </View>
      </View>
      
      <View style={styles.publicInfo}>
        <View style={styles.publicInfoRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>Registered: {new Date(business.createdAt).toLocaleDateString()}</Text>
        </View>
        {business.location && (
          <View style={styles.publicInfoRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.publicInfoText}>{business.location}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.limitedAccessText}>
        Sign up to view full profile, services, and contact information
      </Text>
    </TouchableOpacity>
  );

  const renderHostCard = (host: any) => (
    <TouchableOpacity
      key={host.id}
      style={styles.itemCard}
      onPress={() => {
        Alert.alert(
          'Sign Up Required',
          'Create an account to view full host profiles and contact information.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/auth') }
          ]
        );
      }}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{host.organizationName || 'Event Host'}</Text>
          <Text style={styles.itemSubtitle}>Event Host</Text>
        </View>
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>PUBLIC</Text>
        </View>
      </View>
      
      <View style={styles.publicInfo}>
        <View style={styles.publicInfoRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>Registered: {new Date(host.createdAt).toLocaleDateString()}</Text>
        </View>
        {host.location && (
          <View style={styles.publicInfoRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.publicInfoText}>{host.location}</Text>
          </View>
        )}
        {host.eventsHosted && (
          <View style={styles.publicInfoRow}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.publicInfoText}>{host.eventsHosted} events hosted</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.limitedAccessText}>
        Sign up to view full profile, event history, and contact information
      </Text>
    </TouchableOpacity>
  );

  const renderVenueCard = (venue: any) => (
    <TouchableOpacity
      key={venue.id}
      style={styles.itemCard}
      onPress={() => {
        Alert.alert(
          'Sign Up Required',
          'Create an account to view venue details and contact hosts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/auth') }
          ]
        );
      }}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.itemSubtitle}>Event Venue</Text>
        </View>
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>PUBLIC</Text>
        </View>
      </View>
      
      <View style={styles.publicInfo}>
        <View style={styles.publicInfoRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>{venue.city}, {venue.state}</Text>
        </View>
        <View style={styles.publicInfoRow}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>{venue.eventsCount} events hosted</Text>
        </View>
        <View style={styles.publicInfoRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.publicInfoText}>Last event: {new Date(venue.lastEventDate).toLocaleDateString()}</Text>
        </View>
        {venue.eventHostName && (
          <View style={styles.publicInfoRow}>
            <Users size={14} color="#6B7280" />
            <Text style={styles.publicInfoText}>Host: {venue.eventHostName}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.limitedAccessText}>
        Sign up to view venue details, availability, and contact hosts
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (selectedDirectory) {
      case 'events':
        return filteredData.map(renderEventCard);
      case 'businesses':
        return filteredData.map(renderBusinessCard);
      case 'hosts':
        return filteredData.map(renderHostCard);
      case 'venues':
        return filteredData.map(renderVenueCard);
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Public Directories',
          headerShown: true,
          headerStyle: { backgroundColor: neonTheme.surface },
          headerTintColor: neonTheme.textPrimary,
        }} 
      />

      <LinearGradient
        colors={neonTheme.gradientHeader as unknown as any}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Public Directories</Text>
        <Text style={styles.headerSubtitle}>
          Browse public listings with limited information. Sign up for full access.
        </Text>
        <TouchableOpacity 
          style={styles.headerSignUpButton}
          onPress={() => router.push('/auth')}
        >
          <Text style={styles.headerSignUpText}>Create Account for Full Access</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Directory Type Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.directorySelector}
        contentContainerStyle={styles.directorySelectorContent}
      >
        {directoryOptions.map((option) => {
          const Icon = option.icon;
          const isActive = selectedDirectory === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.directoryOption, isActive && styles.directoryOptionActive]}
              onPress={() => setSelectedDirectory(option.id)}
            >
              <Icon size={20} color={isActive ? '#FFFFFF' : neonTheme.accentCyan} />
              <Text style={[styles.directoryOptionText, isActive && styles.directoryOptionTextActive]}>
                {option.label}
              </Text>
              <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>
                  {option.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${directoryOptions.find(d => d.id === selectedDirectory)?.label.toLowerCase()}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={neonTheme.accentCyan} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.locationInput}
            placeholder="Filter by location..."
            value={locationFilter}
            onChangeText={setLocationFilter}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {filteredData.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No {directoryOptions.find(d => d.id === selectedDirectory)?.label} Found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or check back later for new listings
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.emptyStateButtonText}>Sign Up to Access More</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {renderContent()}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neonTheme.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  signUpButton: {
    backgroundColor: neonTheme.accentCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    marginBottom: 16,
  },
  headerSignUpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  headerSignUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  directorySelector: {
    maxHeight: 80,
  },
  directorySelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  directoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neonTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
  },
  directoryOptionActive: {
    backgroundColor: neonTheme.accentCyan,
  },
  directoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: neonTheme.textPrimary,
    flex: 1,
  },
  directoryOptionTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: neonTheme.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: neonTheme.textSecondary,
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neonTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: neonTheme.textPrimary,
  },
  filterButton: {
    backgroundColor: neonTheme.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    backgroundColor: neonTheme.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationInput: {
    backgroundColor: neonTheme.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: neonTheme.textPrimary,
  },
  content: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  itemCard: {
    backgroundColor: neonTheme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: neonTheme.textSecondary,
  },
  guestBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  publicInfo: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  publicInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  limitedAccessText: {
    fontSize: 12,
    color: neonTheme.accentCyan,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: neonTheme.accentCyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 32,
  },
});