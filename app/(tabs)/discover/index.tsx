import React, { useState, useCallback, useMemo } from 'react';
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
  Users, 
  Search, 
  Filter,
  Building2,
  UserCheck,
  Store,
  MapPin,
  Star,
  MessageCircle,
  DollarSign,
  Calendar,
  ChevronRight,
  Briefcase,
  Award,
  Clock,
} from 'lucide-react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { useAuth } from '@/hooks/auth-store';
import { trpc, handleTRPCError } from '@/lib/trpc';
import { neonTheme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type ProfileRole = 'business_owner' | 'contractor' | 'event_host';

interface FilterState {
  role: ProfileRole | 'all';
  location: string;
  skills: string;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { userRole, currentUser } = useUser();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    role: (params.filter as ProfileRole) || 'all',
    location: '',
    skills: '',
  });

  // Determine what roles to show based on current user role
  const targetRoles = useMemo(() => {
    if (userRole === 'business_owner') {
      return ['contractor', 'event_host'] as ProfileRole[];
    } else if (userRole === 'contractor') {
      return ['business_owner', 'event_host'] as ProfileRole[];
    } else if (userRole === 'event_host') {
      return ['business_owner', 'contractor'] as ProfileRole[];
    }
    return ['business_owner', 'contractor', 'event_host'] as ProfileRole[];
  }, [userRole]);

  // Determine if user is guest
  const isGuest = user?.role === 'guest';
  
  // Search profiles for each target role - use public search for guests
  const businessOwnersQuery = isGuest 
    ? trpc.profile.searchPublic.useQuery(
        {
          role: 'business_owner',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: targetRoles.includes('business_owner') || isGuest,
        }
      )
    : trpc.profile.search.useQuery(
        {
          role: 'business_owner',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: targetRoles.includes('business_owner'),
        }
      );

  const contractorsQuery = isGuest 
    ? trpc.profile.searchPublic.useQuery(
        {
          role: 'contractor',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: false, // Don't show contractors to guests
        }
      )
    : trpc.profile.search.useQuery(
        {
          role: 'contractor',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: targetRoles.includes('contractor'),
        }
      );

  const eventHostsQuery = isGuest 
    ? trpc.profile.searchPublic.useQuery(
        {
          role: 'event_host',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: true, // Show event hosts to guests
        }
      )
    : trpc.profile.search.useQuery(
        {
          role: 'event_host',
          q: searchQuery || filters.skills || filters.location || undefined,
          limit: 20,
        },
        {
          enabled: targetRoles.includes('event_host'),
        }
      );

  const isLoading = businessOwnersQuery.isLoading || contractorsQuery.isLoading || eventHostsQuery.isLoading;
  const hasError = businessOwnersQuery.error || contractorsQuery.error || eventHostsQuery.error;

  React.useEffect(() => {
    if (hasError) {
      console.error('[Discover] Profile search error:', hasError);
      Alert.alert('Error', handleTRPCError(hasError));
    }
  }, [hasError]);

  const allProfiles = useMemo(() => {
    const profiles = [
      ...(businessOwnersQuery.data?.items || []),
      ...(contractorsQuery.data?.items || []),
      ...(eventHostsQuery.data?.items || []),
    ];

    // Filter by role if specified
    if (filters.role !== 'all') {
      return profiles.filter(profile => profile.role === filters.role);
    }

    return profiles;
  }, [businessOwnersQuery.data, contractorsQuery.data, eventHostsQuery.data, filters.role]);

  const handleRefresh = useCallback(() => {
    businessOwnersQuery.refetch();
    contractorsQuery.refetch();
    eventHostsQuery.refetch();
  }, [businessOwnersQuery, contractorsQuery, eventHostsQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleContactProfile = useCallback((profile: any) => {
    if (isGuest) {
      Alert.alert(
        'Sign Up Required', 
        'Please create an account to contact other users and access full profiles.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }
    
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to contact other users');
      return;
    }

    // Navigate to messages with pre-filled recipient info
    router.push({
      pathname: '/messages',
      params: {
        recipientId: profile.userId,
        recipientName: getProfileDisplayName(profile),
        recipientRole: profile.role,
      },
    });
  }, [currentUser, router, isGuest]);

  const getProfileDisplayName = (profile: any) => {
    if (profile.role === 'business_owner') {
      return profile.companyName || 'Business Owner';
    } else if (profile.role === 'event_host') {
      return profile.organizationName || 'Event Host';
    }
    return 'Contractor';
  };

  const getProfileDescription = (profile: any) => {
    if (profile.role === 'business_owner') {
      return profile.description || 'No description available';
    } else if (profile.role === 'contractor') {
      return profile.bio || 'No bio available';
    } else if (profile.role === 'event_host') {
      return profile.bio || 'No bio available';
    }
    return '';
  };

  const getProfileSkills = (profile: any) => {
    if (profile.role === 'business_owner') {
      return profile.needs || [];
    } else if (profile.role === 'contractor') {
      return profile.skills || [];
    } else if (profile.role === 'event_host') {
      return profile.interests || [];
    }
    return [];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'business_owner':
        return <Building2 size={20} color={neonTheme.accentCyan} />;
      case 'contractor':
        return <UserCheck size={20} color="#8B5CF6" />;
      case 'event_host':
        return <Store size={20} color="#F59E0B" />;
      default:
        return <Users size={20} color="#6B7280" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'business_owner':
        return neonTheme.accentCyan;
      case 'contractor':
        return '#8B5CF6';
      case 'event_host':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderProfileCard = (profile: any) => {
    const isPublicView = isGuest;
    
    return (
      <TouchableOpacity
        key={profile.id}
        style={styles.profileCard}
        onPress={() => {
          if (isGuest) {
            Alert.alert(
              'Sign Up Required',
              'Create an account to view full profiles and contact information.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Up', onPress: () => router.push('/auth') }
              ]
            );
          } else {
            router.push(`/(tabs)/discover/${profile.id}` as any);
          }
        }}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <View style={styles.profileTitleRow}>
              {getRoleIcon(profile.role)}
              <Text style={styles.profileName} numberOfLines={1}>
                {getProfileDisplayName(profile)}
              </Text>

            </View>
            {!isPublicView && (
              <Text style={[styles.profileRole, { color: getRoleColor(profile.role) }]}>
                {profile.role.replace('_', ' ').toUpperCase()}
              </Text>
            )}
          </View>
          {!isPublicView && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContactProfile(profile)}
              testID="contact-profile"
            >
              <MessageCircle size={18} color={neonTheme.accentCyan} />
            </TouchableOpacity>
          )}
        </View>



        {isPublicView ? (
          <View style={styles.publicInfo}>
            {profile.state && (
              <Text style={styles.publicInfoText} testID="public-state">
                {profile.state}
              </Text>
            )}
          </View>
        ) : (
          <>
            {profile.location && (
              <View style={styles.profileLocation}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.locationText}>{profile.location}</Text>
              </View>
            )}

            {profile.role === 'contractor' && profile.ratePerHour && (
              <View style={styles.profileRate}>
                <DollarSign size={14} color="#10B981" />
                <Text style={styles.rateText}>${profile.ratePerHour}/hour</Text>
              </View>
            )}

            {profile.role === 'event_host' && profile.eventsHosted && (
              <View style={styles.profileStats}>
                <Calendar size={14} color="#F59E0B" />
                <Text style={styles.statsText}>{profile.eventsHosted} events hosted</Text>
              </View>
            )}

            <View style={styles.profileSkills}>
              {getProfileSkills(profile).slice(0, 3).map((skill: string, index: number) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {getProfileSkills(profile).length > 3 && (
                <Text style={styles.moreSkills}>+{getProfileSkills(profile).length - 3} more</Text>
              )}
            </View>

            <View style={styles.profileFooter}>
              <Text style={styles.joinedDate}>
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </Text>
              <ChevronRight size={16} color="#6B7280" />
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Allow guests to view public directories
  if (!userRole && !isGuest) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Discover Professionals',
            headerShown: true,
            headerStyle: { backgroundColor: neonTheme.surface },
            headerTintColor: neonTheme.textPrimary,
          }} 
        />
        <View style={styles.emptyState}>
          <Users size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>Please Log In</Text>
          <Text style={styles.emptyStateText}>
            Log in to discover and connect with other professionals
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Discover Professionals',
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
        <Text style={styles.headerTitle}>Discover Professionals</Text>
        <Text style={styles.headerSubtitle}>
          {isGuest
            ? 'Public view: only name and state are visible'
            : userRole === 'business_owner' 
            ? 'Find contractors and event hosts to work with'
            : userRole === 'contractor'
            ? 'Connect with businesses and event organizers'
            : 'Find businesses and contractors for your events'
          }
        </Text>
        {isGuest && (
          <TouchableOpacity 
            style={styles.guestSignUpButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.guestSignUpText}>Create Account for Full Access</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by skills, location, or company..."
            value={searchQuery}
            onChangeText={handleSearch}
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
          <Text style={styles.filtersTitle}>Filters</Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Role:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
              {['all', ...targetRoles].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleFilterButton,
                    filters.role === role && styles.roleFilterButtonActive
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, role: role as any }))}
                >
                  <Text style={[
                    styles.roleFilterText,
                    filters.role === role && styles.roleFilterTextActive
                  ]}>
                    {role === 'all' ? 'All' : role.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {allProfiles.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Professionals Found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or filters to find more professionals
            </Text>
          </View>
        ) : (
          <View style={styles.profilesList}>
            {allProfiles.map(renderProfileCard)}
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
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: neonTheme.textPrimary,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: neonTheme.textSecondary,
    marginBottom: 8,
  },
  roleFilters: {
    flexDirection: 'row',
  },
  roleFilterButton: {
    backgroundColor: neonTheme.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  roleFilterButtonActive: {
    backgroundColor: neonTheme.accentCyan,
  },
  roleFilterText: {
    fontSize: 14,
    color: neonTheme.textSecondary,
    textTransform: 'capitalize',
  },
  roleFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profilesList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    flex: 1,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contactButton: {
    backgroundColor: `${neonTheme.accentCyan}15`,
    borderRadius: 20,
    padding: 8,
  },
  profileDescription: {
    fontSize: 14,
    color: neonTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  profileLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileRate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rateText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  profileSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: neonTheme.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    color: neonTheme.textSecondary,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  profileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: neonTheme.border,
  },
  joinedDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
  },
  bottomSpacing: {
    height: 32,
  },
  guestBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
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
  },
  publicInfoText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  limitedAccessText: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic',
    marginTop: 4,
  },
  guestSignUpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'center',
  },
  guestSignUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});