import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { 
  ArrowLeft,
  Building2,
  UserCheck,
  Store,
  MapPin,
  MessageCircle,
  DollarSign,
  Calendar,
  Globe,
  Phone,
  Mail,
  Star,
  Award,
  Briefcase,
  Clock,
  Users,
} from 'lucide-react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/hooks/user-store';
import { useAuth } from '@/hooks/auth-store';
import { trpc, handleTRPCError } from '@/lib/trpc';
import { neonTheme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { currentUser } = useUser();
  const { user } = useAuth();
  const [isContacting, setIsContacting] = useState<boolean>(false);

  // Determine if user is guest
  const isGuest = user?.role === 'guest';
  
  const profileQuery = isGuest 
    ? trpc.profile.getPublicById.useQuery(
        { profileId: id as string },
        { 
          enabled: !!id,
        }
      )
    : trpc.profile.getById.useQuery(
        { profileId: id as string },
        { 
          enabled: !!id,
        }
      );

  React.useEffect(() => {
    if (profileQuery.error) {
      console.error('[ProfileDetail] Profile query error:', profileQuery.error);
      Alert.alert('Error', handleTRPCError(profileQuery.error));
    }
  }, [profileQuery.error]);

  const profile = profileQuery.data;

  const handleContact = async () => {
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
    
    if (!currentUser || !profile) {
      Alert.alert('Error', 'Unable to send message');
      return;
    }

    setIsContacting(true);
    
    try {
      // Navigate to messages with pre-filled recipient info
      router.push({
        pathname: '/messages',
        params: {
          recipientId: profile.userId,
          recipientName: getProfileDisplayName(profile),
          recipientRole: profile.role,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to open messaging');
    } finally {
      setIsContacting(false);
    }
  };

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

  const getRoleIcon = (role: string, size: number = 24) => {
    switch (role) {
      case 'business_owner':
        return <Building2 size={size} color={neonTheme.accentCyan} />;
      case 'contractor':
        return <UserCheck size={size} color="#8B5CF6" />;
      case 'event_host':
        return <Store size={size} color="#F59E0B" />;
      default:
        return <Users size={size} color="#6B7280" />;
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

  if (profileQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Profile',
            headerShown: true,
            headerStyle: { backgroundColor: neonTheme.surface },
            headerTintColor: neonTheme.textPrimary,
          }} 
        />
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Profile Not Found',
            headerShown: true,
            headerStyle: { backgroundColor: neonTheme.surface },
            headerTintColor: neonTheme.textPrimary,
          }} 
        />
        <View style={styles.emptyState}>
          <Users size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>Profile Not Found</Text>
          <Text style={styles.emptyStateText}>
            This profile may have been removed or doesn't exist
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: getProfileDisplayName(profile),
          headerShown: true,
          headerStyle: { backgroundColor: neonTheme.surface },
          headerTintColor: neonTheme.textPrimary,
        }} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[getRoleColor(profile.role), `${getRoleColor(profile.role)}80`]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileHeaderContent}>
            <View style={styles.profileIconContainer}>
              {getRoleIcon(profile.role, 32)}
            </View>
            <Text style={styles.profileName}>
              {getProfileDisplayName(profile)}
            </Text>
            <Text style={styles.profileRole}>
              {profile.role.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.joinedDate}>
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.profileBody}>
          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                Sign up to view full profile details and contact information
              </Text>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.profileDescription}>
              {getProfileDescription(profile)}
            </Text>
          </View>

          {profile.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <MapPin size={20} color="#6B7280" />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            </View>
          )}

          {profile.role === 'business_owner' && (
            <>
              {profile.companyWebsite && !isGuest && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Website</Text>
                  <View style={styles.infoRow}>
                    <Globe size={20} color="#6B7280" />
                    <Text style={styles.infoText}>{profile.companyWebsite}</Text>
                  </View>
                </View>
              )}
              
              {profile.needs && profile.needs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Looking For</Text>
                  <View style={styles.skillsContainer}>
                    {profile.needs.map((need: string, index: number) => (
                      <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText}>{need}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {profile.role === 'contractor' && (
            <>
              {profile.ratePerHour && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Rate</Text>
                  <View style={styles.infoRow}>
                    <DollarSign size={20} color="#10B981" />
                    <Text style={[styles.infoText, { color: '#10B981', fontWeight: '600' }]}>
                      ${profile.ratePerHour}/hour
                    </Text>
                  </View>
                </View>
              )}

              {profile.availability && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                  <View style={styles.infoRow}>
                    <Clock size={20} color="#6B7280" />
                    <Text style={styles.infoText}>
                      {profile.availability.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}

              {profile.portfolioUrl && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Portfolio</Text>
                  <View style={styles.infoRow}>
                    <Briefcase size={20} color="#6B7280" />
                    <Text style={styles.infoText}>{profile.portfolioUrl}</Text>
                  </View>
                </View>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Skills</Text>
                  <View style={styles.skillsContainer}>
                    {profile.skills.map((skill: string, index: number) => (
                      <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {profile.role === 'event_host' && (
            <>
              {profile.eventsHosted !== undefined && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Experience</Text>
                  <View style={styles.infoRow}>
                    <Calendar size={20} color="#F59E0B" />
                    <Text style={styles.infoText}>
                      {profile.eventsHosted} events hosted
                    </Text>
                  </View>
                </View>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Event Interests</Text>
                  <View style={styles.skillsContainer}>
                    {profile.interests.map((interest: string, index: number) => (
                      <View key={index} style={styles.skillTag}>
                        <Text style={styles.skillText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <View style={styles.contactSection}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContact}
          disabled={isContacting}
        >
          <LinearGradient
            colors={neonTheme.gradientHeader as unknown as any}
            style={styles.contactButtonGradient}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>
              {isGuest ? 'Sign Up to Contact' : isContacting ? 'Opening...' : 'Send Message'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neonTheme.background,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  profileBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    marginBottom: 12,
  },
  profileDescription: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: neonTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neonTheme.border,
  },
  skillText: {
    fontSize: 14,
    color: neonTheme.textPrimary,
    fontWeight: '500',
  },
  contactSection: {
    padding: 20,
    backgroundColor: neonTheme.surface,
    borderTopWidth: 1,
    borderTopColor: neonTheme.border,
  },
  contactButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: neonTheme.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: neonTheme.accentCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 32,
  },
  guestNotice: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  guestNoticeText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
});