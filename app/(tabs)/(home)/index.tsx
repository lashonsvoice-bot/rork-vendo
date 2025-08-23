import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FooterLinks } from "@/components/FooterLinks";
import {
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  MapPin,
  Clock,
  Building2,
  UserCheck,
  Store,
  LogOut,
  MessageCircle,
  FileText,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { useCommunication } from "@/hooks/communication-store";
import { useTheme } from "@/hooks/theme-store";
import { useAuth } from "@/hooks/auth-store";
import { trpc, handleTRPCError, testTRPCConnection } from "@/lib/trpc";
import { Alert } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { events } = useEvents();
  const { userRole, currentUser, logout: clearUserStore } = useUser();
  const { getUnreadMessagesCount } = useCommunication();
  const { user, logout: authLogout, isGuest, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  
  // Always call all hooks before any conditional logic
  const profileQuery = trpc.profile.get.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id && !isGuest,
      retry: (failureCount, error) => {
        console.log('[Home] Profile query retry:', failureCount, error?.message);
        return failureCount < 2;
      },
    }
  );
  
  const w9RequiredQuery = trpc.tax.w9.checkRequired.useQuery(
    { contractorId: user?.id || '' },
    { enabled: !!user?.id && user?.role === 'contractor' && !isGuest }
  );
  
  // Test connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      console.log('[Home] Testing tRPC connection...');
      const isConnected = await testTRPCConnection();
      console.log('[Home] Connection test result:', isConnected);
    };
    
    if (!isGuest && user?.id) {
      testConnection();
    }
  }, [isGuest, user?.id]);
  
  React.useEffect(() => {
    if (profileQuery.error && !isGuest) {
      console.error('[Home] Profile query error:', profileQuery.error);
      // Show user-friendly error message
      if (profileQuery.error.message.includes('Network error') || profileQuery.error.message.includes('Failed to fetch')) {
        Alert.alert(
          'Connection Error', 
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            { text: 'Test Connection', onPress: async () => {
              const isConnected = await testTRPCConnection();
              Alert.alert('Connection Test', isConnected ? 'Connection successful!' : 'Connection failed. Please check server status.');
            }},
            { text: 'Retry', onPress: () => profileQuery.refetch() },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', handleTRPCError(profileQuery.error));
      }
    }
  }, [profileQuery.error, isGuest, profileQuery.refetch]);
  
  // Compute derived values after all hooks
  const upcomingEvents = events.slice(0, 3);
  
  console.log('[Home] Profile data:', profileQuery.data);
  console.log('[Home] Profile loading:', profileQuery.isLoading);
  console.log('[Home] Profile error:', profileQuery.error);
  console.log('[Home] User info:', { id: user?.id, role: user?.role, isGuest });
  console.log('[Home] Query enabled:', !!user?.id && !isGuest);
  
  // Compute styles after all hooks
  const upcomingEventsComputed = React.useMemo(() => events.slice(0, 3), [events]);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 20 : 10,
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    headerContent: {
      marginTop: 10,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    messagesButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    messageBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: "#EF4444",
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.surface,
    },
    messageBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold",
    },
    logoutButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    appTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    welcomeText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 15,
      marginTop: -20,
    },
    statCard: {
      width: "47%",
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      margin: "1.5%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 2,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.textPrimary,
    },
    seeAll: {
      fontSize: 14,
      color: theme.accentCyan,
      fontWeight: "600",
    },
    quickActions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    actionGradient: {
      padding: 20,
      borderRadius: 16,
      alignItems: "center",
      gap: 8,
    },
    actionOutline: {
      padding: 20,
      borderRadius: 16,
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
    },
    actionText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    actionTextOutline: {
      color: theme.accentCyan,
      fontSize: 14,
      fontWeight: "600",
    },
    eventCard: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 2,
      overflow: "hidden",
    },
    eventCardHighlighted: {
      backgroundColor: "#2A174F",
      borderWidth: 2,
      borderColor: theme.accentAmber,
      shadowColor: theme.accentAmber,
      shadowOpacity: 0.35,
    },
    eventCardHost: {
      borderWidth: 2,
      borderColor: theme.accentAmber,
      shadowColor: theme.accentAmber,
      shadowOpacity: 0.1,
    },
    eventCardContractor: {
      borderWidth: 2,
      borderColor: "#8B5CF6",
      shadowColor: "#8B5CF6",
      shadowOpacity: 0.1,
    },
    eventCardBusinessOwner: {
      borderWidth: 2,
      borderColor: theme.accentCyan,
      shadowColor: "#10B981",
      shadowOpacity: 0.1,
    },
    eventImageContainer: {
      width: 100,
      height: 100,
      position: "relative",
    },
    eventImage: {
      width: "100%",
      height: "100%",
      backgroundColor: "#1E1638",
    },
    eventBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "#10B981",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    eventBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "600",
    },
    eventContent: {
      flex: 1,
      padding: 12,
      justifyContent: "space-between",
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textPrimary,
      marginBottom: 6,
    },
    eventInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    eventInfoText: {
      fontSize: 13,
      color: theme.textSecondary,
      flex: 1,
    },
    eventFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    eventPayContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    postedByTag: {
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginLeft: 8,
    },
    postedByText: {
      fontSize: 11,
      fontWeight: "600",
    },
    eventPay: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.accentCyan,
    },
    bottomSpacing: {
      height: 28,
    },
    guestHeader: {
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 30,
      paddingHorizontal: 20,
    },
    guestHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    guestTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    signUpButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    signUpButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    guestSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    guestContent: {
      paddingHorizontal: 20,
      paddingTop: 30,
    },
    guestPrompt: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 30,
    },
    directoryCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 2,
      borderColor: theme.border,
    },
    businessCard: {
      borderColor: theme.accentCyan,
    },
    hostCard: {
      borderColor: theme.accentAmber,
    },
    eventsCard: {
      borderColor: theme.accentPink,
    },
    directoryIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      alignSelf: 'center',
    },
    directoryTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    directoryDescription: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 22,
    },
    directoryFeatures: {
      gap: 6,
      alignItems: 'center',
    },
    directoryFeature: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    guestCTA: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginTop: 20,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.accentLime,
    },
    guestCTATitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 8,
    },
    guestCTAText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
    },
    fullAccessButton: {
      backgroundColor: theme.accentLime,
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 25,
    },
    fullAccessButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    w9AlertContainer: {
      paddingHorizontal: 20,
      marginTop: -10,
      marginBottom: 10,
    },
    w9Alert: {
      backgroundColor: '#f8d7da',
      borderColor: '#f5c6cb',
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
    },
    w9AlertContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    w9AlertText: {
      flex: 1,
      marginLeft: 12,
    },
    w9AlertTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#721c24',
      marginBottom: 4,
    },
    w9AlertSubtitle: {
      fontSize: 14,
      color: '#721c24',
      marginBottom: 4,
    },
    w9AlertEvents: {
      fontSize: 12,
      color: '#721c24',
      fontWeight: '500',
    },
  }), [theme]);

  // Guest user screen - redirect to public directories
  if (isGuest) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={theme.gradientHeader as unknown as any}
          style={[styles.guestHeader, { backgroundColor: theme.background }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.guestHeaderTop}>
            <Text style={styles.guestTitle}>Welcome to RevoVend</Text>
            <TouchableOpacity 
              style={styles.signUpButton}
              onPress={() => router.push('/auth/role-selection' as const)}
            >
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.guestSubtitle}>
            Browse public business and event host directories
          </Text>
        </LinearGradient>

        <View style={styles.guestContent}>
          <Text style={styles.guestPrompt}>Explore Public Directories</Text>
          
          <TouchableOpacity
            style={[styles.directoryCard, styles.businessCard]}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <View style={[styles.directoryIcon, { backgroundColor: `${theme.accentCyan}15` }]}>
              <Building2 size={32} color={theme.accentCyan} />
            </View>
            <Text style={styles.directoryTitle}>Business Directory</Text>
            <Text style={styles.directoryDescription}>
              Browse registered businesses and their basic information
            </Text>
            <View style={styles.directoryFeatures}>
              <Text style={styles.directoryFeature}>• Company names and registration dates</Text>
              <Text style={styles.directoryFeature}>• State locations</Text>
              <Text style={styles.directoryFeature}>• Limited public information</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.directoryCard, styles.hostCard]}
            onPress={() => router.push({ pathname: '/(tabs)/discover', params: { filter: 'event_host' } })}
          >
            <View style={[styles.directoryIcon, { backgroundColor: `${theme.accentAmber}15` }]}>
              <Store size={32} color={theme.accentAmber} />
            </View>
            <Text style={styles.directoryTitle}>Event Host Directory</Text>
            <Text style={styles.directoryDescription}>
              Discover event hosts and venue organizers
            </Text>
            <View style={styles.directoryFeatures}>
              <Text style={styles.directoryFeature}>• Organization names</Text>
              <Text style={styles.directoryFeature}>• Registration information</Text>
              <Text style={styles.directoryFeature}>• State locations</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.directoryCard, styles.eventsCard]}
            onPress={() => router.push('/(tabs)/events' as const)}
          >
            <View style={[styles.directoryIcon, { backgroundColor: `${theme.accentPink}15` }]}>
              <Calendar size={32} color={theme.accentPink} />
            </View>
            <Text style={styles.directoryTitle}>Public Events</Text>
            <Text style={styles.directoryDescription}>
              View upcoming public events and basic details
            </Text>
            <View style={styles.directoryFeatures}>
              <Text style={styles.directoryFeature}>• Event names and dates</Text>
              <Text style={styles.directoryFeature}>• Location information</Text>
              <Text style={styles.directoryFeature}>• Limited event details</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.guestCTA}>
            <Text style={styles.guestCTATitle}>Want Full Access?</Text>
            <Text style={styles.guestCTAText}>
              Create an account to contact businesses, view detailed profiles, and access all features.
            </Text>
            <TouchableOpacity 
              style={styles.fullAccessButton}
              onPress={() => router.push('/auth/role-selection' as const)}
            >
              <Text style={styles.fullAccessButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FooterLinks align="center" />
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  }

  // Show loading if no user (AuthGuard will handle redirect)
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  // Loading state while user role is initializing after auth
  if (user && !userRole) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="home-initializing">
        <Text style={{ color: '#6B7280' }}>{authLoading ? 'Loading…' : 'Preparing your home…'}</Text>
      </View>
    );
  }

  // Different stats based on user role
  const stats = React.useMemo(() => {
    if (userRole === 'business_owner') {
      return [
        { label: "Active Events", value: "12", icon: Calendar, color: theme.accentCyan },
        { label: "Contractors", value: "48", icon: Users, color: theme.accentCyan },
        { label: "This Month", value: "$8.5K", icon: DollarSign, color: theme.accentAmber },
        { label: "Growth", value: "+23%", icon: TrendingUp, color: theme.accentPink },
      ];
    } else if (userRole === 'contractor') {
      return [
        { label: "Available Jobs", value: "8", icon: Calendar, color: "#8B5CF6" },
        { label: "Completed", value: "23", icon: UserCheck, color: "#8B5CF6" },
        { label: "This Month", value: "$2.1K", icon: DollarSign, color: theme.accentAmber },
        { label: "Rating", value: "4.8★", icon: TrendingUp, color: theme.accentPink },
      ];
    } else {
      return [
        { label: "Listed Events", value: "15", icon: Store, color: theme.accentCyan },
        { label: "Vendors", value: "127", icon: Users, color: theme.accentCyan },
        { label: "This Month", value: "$3.2K", icon: DollarSign, color: theme.accentAmber },
        { label: "Rating", value: "4.9★", icon: TrendingUp, color: theme.accentPink },
      ];
    }
  }, [userRole, theme]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={theme.gradientHeader as unknown as any}
        style={[styles.header, { backgroundColor: theme.background }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.appTitle}>RevoVend</Text>
              <Text style={styles.welcomeText}>Welcome back, {currentUser?.name}!</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.messagesButton}
                onPress={() => router.push('/messages' as const)}
              >
                <MessageCircle size={20} color={theme.textPrimary} />
                {currentUser && getUnreadMessagesCount(currentUser.id) > 0 && (
                  <View style={styles.messageBadge}>
                    <Text style={styles.messageBadgeText}>
                      {getUnreadMessagesCount(currentUser.id)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={async () => { try { await authLogout(); } catch {} finally { clearUserStore(); } }}
              >
                <LogOut size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>
            {userRole === 'business_owner' 
              ? 'Expand Your Business Nationwide' 
              : userRole === 'contractor'
              ? 'Find Your Next Opportunity'
              : 'Monetize Your Events'
            }
          </Text>
          <Text style={styles.headerSubtitle}>
            {userRole === 'business_owner' 
              ? 'Set up a vendor booth around the world without the traveling.'
              : userRole === 'contractor'
              ? 'Discover events and grow your contractor career'
              : 'Attract vendors from across the country'
            }
          </Text>
        </View>
      </LinearGradient>

      {/* W9 Required Notification for Contractors */}
      {user?.role === 'contractor' && w9RequiredQuery.data?.w9Required && !w9RequiredQuery.data?.hasValidW9 && (
        <View style={styles.w9AlertContainer}>
          <TouchableOpacity 
            style={styles.w9Alert}
            onPress={() => router.push('/w9-form' as const)}
          >
            <View style={styles.w9AlertContent}>
              <FileText size={24} color="#d63384" />
              <View style={styles.w9AlertText}>
                <Text style={styles.w9AlertTitle}>W-9 Form Required</Text>
                <Text style={styles.w9AlertSubtitle}>
                  Complete your W-9 form to proceed with selected events
                </Text>
                {w9RequiredQuery.data.eventsRequiringW9.length > 0 && (
                  <Text style={styles.w9AlertEvents}>
                    {w9RequiredQuery.data.eventsRequiringW9.length} event(s) waiting
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                <Icon size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/send-test-email' as const)}
            testID="qa-send-test-email"
          >
            <View style={styles.actionOutline}>
              <FileText size={24} color={theme.accentCyan} />
              <Text style={styles.actionTextOutline}>Test Email</Text>
            </View>
          </TouchableOpacity>
          {userRole === 'business_owner' ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push({ pathname: '/(tabs)/events', params: { filter: 'awaiting_host' } })}
                testID="qa-find-events"
              >
                <LinearGradient
                  colors={theme.gradientHeader as unknown as any}
                  style={styles.actionGradient}
                >
                  <Calendar size={24} color={theme.textPrimary} />
                  <Text style={styles.actionText}>Find Events</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  console.log('[Home] Quick Action -> Hire Contractors (Ready to Hire filter)');
                  router.push({ pathname: '/(tabs)/events', params: { filter: 'ready_to_hire' } });
                }}
                testID="qa-hire-contractors"
              >
                <View style={styles.actionOutline}>
                  <Users size={24} color={theme.accentCyan} />
                  <Text style={styles.actionTextOutline}>Hire Contractors</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/events/owner-checkins' as const)}
                testID="qa-owner-checkins"
              >
                <View style={styles.actionOutline}>
                  <Users size={24} color={theme.accentCyan} />
                  <Text style={styles.actionTextOutline}>Check-ins</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : userRole === 'contractor' ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/events' as const)}
              >
                <LinearGradient
                  colors={theme.gradientHeader as unknown as any}
                  style={styles.actionGradient}
                >
                  <Calendar size={24} color={theme.textPrimary} />
                  <Text style={styles.actionText}>Browse Jobs</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/profile' as const)}
              >
                <View style={styles.actionOutline}>
                  <UserCheck size={24} color="#8B5CF6" />
                  <Text style={styles.actionTextOutline}>Complete Training</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/create' as const)}
              >
                <LinearGradient
                  colors={theme.gradientHeader as unknown as any}
                  style={styles.actionGradient}
                >
                  <Store size={24} color={theme.textPrimary} />
                  <Text style={styles.actionText}>List Event</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/events' as const)}
              >
                <View style={styles.actionOutline}>
                  <DollarSign size={24} color={theme.accentCyan} />
                  <Text style={styles.actionTextOutline}>Event Management</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {userRole === 'business_owner' 
              ? 'Available Events' 
              : userRole === 'contractor'
              ? 'Available Opportunities'
              : 'Your Events'
            }
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/events")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {upcomingEventsComputed.map((event) => {
          const isHighlighted = event.contractorsNeeded === 0 && event.createdBy === 'event_host' && !event.businessOwnerSelected;
          
          // Color coding based on who posted the event
          const getEventCardStyle = () => {
            if (isHighlighted) {
              return [styles.eventCard, styles.eventCardHighlighted];
            } else {
              switch (event.createdBy) {
                case 'event_host':
                  return [styles.eventCard, styles.eventCardHost];
                case 'contractor':
                  return [styles.eventCard, styles.eventCardContractor];
                case 'business_owner':
                  return [styles.eventCard, styles.eventCardBusinessOwner];
                default:
                  return [styles.eventCard];
              }
            }
          };
          
          return (
            <TouchableOpacity
              key={event.id}
              style={getEventCardStyle()}
              onPress={() => router.push({ pathname: '/(tabs)/events/[id]', params: { id: event.id } })}
            >
              <View style={styles.eventImageContainer}>
                <Image
                  source={{ uri: event.flyerUrl }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
                {!isHighlighted && (
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>
                      {`${event.contractorsNeeded} spots`}
                    </Text>
                  </View>
                )}
              </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <View style={styles.eventInfo}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.eventInfoText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.eventInfoText}>{event.date}</Text>
              </View>
              <View style={styles.eventFooter}>
                <View style={styles.eventPayContainer}>
                  <Text style={styles.eventPay}>
                    {userRole === 'business_owner' 
                      ? `${event.contractorPay}/contractor`
                      : userRole === 'contractor'
                      ? `${event.contractorPay}/contractor`
                      : event.tableOptions && event.tableOptions.length > 0
                      ? `${event.tableOptions.reduce((taken, table) => taken + (table.quantity - table.availableQuantity), 0)}/${event.totalVendorSpaces || 0} taken`
                      : `${event.contractorsNeeded} spots available`
                    }
                  </Text>
                  <View style={styles.postedByTag}>
                    <Text style={[styles.postedByText, {
                      color: event.createdBy === 'event_host' ? theme.accentAmber : 
                             event.createdBy === 'contractor' ? '#8B5CF6' : theme.accentLime
                    }]}>
                      {event.createdBy === 'event_host' ? 'Host' : 
                       event.createdBy === 'contractor' ? 'Contractor' : 'Business'}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={16} color={theme.accentCyan} />
              </View>
            </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FooterLinks align="center" />
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}