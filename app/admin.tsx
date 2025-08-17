import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/auth-store';
import { trpc } from '@/lib/trpc';
import { 
  Users, 
  Activity, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  UserCheck,
  Calendar,
  TrendingUp,
  FileText,
  Briefcase,
} from 'lucide-react-native';

const theme = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#C6C6C8',
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

type TabType = 'analytics' | 'users' | 'appeals' | 'activity';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [refreshing, setRefreshing] = useState(false);

  // Check for admin access (either direct admin role or hidden admin via lashonsvoice@gmail.com)
  const hasAdminAccess = user?.role === 'admin' || 
    (user?.email.toLowerCase() === 'lashonsvoice@gmail.com' && user?.role === 'business_owner');
  
  // Redirect if not admin
  if (!hasAdminAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={theme.error} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>You don&apos;t have permission to access this page.</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={logout}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh all queries - using refetch instead of invalidate
    setRefreshing(false); // Just set refreshing to false for now
    setRefreshing(false);
  };

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <View>{icon}</View>
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Admin Dashboard',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={styles.signOutHeaderButton}>
              <Text style={styles.signOutHeaderText}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.tabContainer}>
        {renderTabButton('analytics', <TrendingUp size={20} color={activeTab === 'analytics' ? theme.primary : theme.text.secondary} />, 'Analytics')}
        {renderTabButton('users', <Users size={20} color={activeTab === 'users' ? theme.primary : theme.text.secondary} />, 'Users')}
        {renderTabButton('appeals', <AlertTriangle size={20} color={activeTab === 'appeals' ? theme.primary : theme.text.secondary} />, 'Appeals')}
        {renderTabButton('activity', <Activity size={20} color={activeTab === 'activity' ? theme.primary : theme.text.secondary} />, 'Activity')}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'appeals' && <AppealsTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalyticsTab() {
  const { data: analytics, isLoading } = trpc.admin.getAnalytics.useQuery();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
      </View>
    );
  }

  const StatCard = ({ title, value, icon, color = theme.primary, onPress }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.statCard, onPress && styles.clickableStatCard]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statHeader}>
        <View>{icon}</View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Platform Overview</Text>
      
      <View style={styles.statsGrid}>
        <StatCard
          title="Active Events"
          value={analytics.activeEvents}
          icon={<Calendar size={24} color={theme.success} />}
          color={theme.success}
        />
        <StatCard
          title="Contractors This Month"
          value={analytics.contractorApplicationsThisMonth}
          icon={<Briefcase size={24} color={theme.secondary} />}
          color={theme.secondary}
        />
        <StatCard
          title="Monthly Revenue"
          value={`${analytics.monthlyRevenue.toLocaleString()}`}
          icon={<DollarSign size={24} color={theme.success} />}
          color={theme.success}
        />
        <StatCard
          title="Weekly Growth"
          value={`${analytics.weeklyGrowth >= 0 ? '+' : ''}${analytics.weeklyGrowth.toFixed(1)}%`}
          icon={<TrendingUp size={24} color={analytics.weeklyGrowth >= 0 ? theme.success : theme.error} />}
          color={analytics.weeklyGrowth >= 0 ? theme.success : theme.error}
        />
      </View>

      <Text style={styles.sectionTitle}>Platform Stats</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={analytics.totalUsers}
          icon={<Users size={24} color={theme.primary} />}
        />
        <StatCard
          title="Total Events"
          value={analytics.totalEvents}
          icon={<Calendar size={24} color={theme.secondary} />}
          color={theme.secondary}
        />
        <StatCard
          title="Total Revenue"
          value={`${analytics.totalRevenue.toLocaleString()}`}
          icon={<DollarSign size={24} color={theme.success} />}
          color={theme.success}
        />
        <StatCard
          title="Suspended Users"
          value={analytics.suspendedUsers}
          icon={<Ban size={24} color={theme.error} />}
          color={theme.error}
        />
      </View>

      <Text style={styles.sectionTitle}>Users by Role</Text>
      <View style={styles.roleStats}>
        <View style={styles.roleStatItem}>
          <Text style={styles.roleStatLabel}>Business Owners</Text>
          <Text style={styles.roleStatValue}>{analytics.usersByRole.business_owner}</Text>
        </View>
        <View style={styles.roleStatItem}>
          <Text style={styles.roleStatLabel}>Contractors</Text>
          <Text style={styles.roleStatValue}>{analytics.usersByRole.contractor}</Text>
        </View>
        <View style={styles.roleStatItem}>
          <Text style={styles.roleStatLabel}>Event Hosts</Text>
          <Text style={styles.roleStatValue}>{analytics.usersByRole.event_host}</Text>
        </View>
      </View>

      {analytics.flaggedUsers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Flagged Users</Text>
          {analytics.flaggedUsers.map((user: any) => (
            <View key={user.id} style={styles.flaggedUserCard}>
              <View style={styles.flaggedUserHeader}>
                <Text style={styles.flaggedUserName}>{user.name}</Text>
                <Text style={styles.flaggedUserRole}>{user.role}</Text>
              </View>
              <Text style={styles.flaggedUserReason}>{user.reason}</Text>
              <Text style={styles.flaggedUserCount}>Violations: {user.count}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'business_owner' | 'contractor' | 'event_host'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const { data: usersData, isLoading } = trpc.admin.getUsers.useQuery({
    page,
    limit: 20,
    search,
    role: roleFilter,
    status: statusFilter,
  });

  const suspendUserMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User suspended successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const unsuspendUserMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User unsuspended successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSuspendUser = (userId: string, userName: string) => {
    Alert.prompt(
      'Suspend User',
      `Enter reason for suspending ${userName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: (reason) => {
            if (reason?.trim()) {
              suspendUserMutation.mutate({ userId, reason: reason.trim() });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleUnsuspendUser = (userId: string, userName: string) => {
    Alert.alert(
      'Unsuspend User',
      `Are you sure you want to unsuspend ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsuspend',
          onPress: () => unsuspendUserMutation.mutate({ userId }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>User Management</Text>
      
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
        />
        
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Role:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'business_owner', 'contractor', 'event_host'] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.filterButton, roleFilter === role && styles.activeFilterButton]}
                onPress={() => setRoleFilter(role)}
              >
                <Text style={[styles.filterButtonText, roleFilter === role && styles.activeFilterButtonText]}>
                  {role === 'all' ? 'All' : role.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'active', 'suspended'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, statusFilter === status && styles.activeFilterButton]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterButtonText, statusFilter === status && styles.activeFilterButtonText]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {usersData?.users.map((user: any) => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userRole}>{user.role.replace('_', ' ')}</Text>
            </View>
            <View style={styles.userActions}>
              {user.suspended ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.unsuspendButton]}
                  onPress={() => handleUnsuspendUser(user.id, user.name)}
                >
                  <UserCheck size={16} color={theme.success} />
                  <Text style={[styles.actionButtonText, { color: theme.success }]}>Unsuspend</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.suspendButton]}
                  onPress={() => handleSuspendUser(user.id, user.name)}
                >
                  <Ban size={16} color={theme.error} />
                  <Text style={[styles.actionButtonText, { color: theme.error }]}>Suspend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {user.suspended && (
            <View style={styles.suspensionInfo}>
              <Text style={styles.suspensionReason}>Reason: {user.suspendedReason}</Text>
              <Text style={styles.suspensionDate}>
                Suspended: {user.suspendedAt ? new Date(user.suspendedAt).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          )}
          
          <View style={styles.userMeta}>
            <Text style={styles.userMetaText}>
              Joined: {new Date(user.createdAt).toLocaleDateString()}
            </Text>
            {user.lastLoginAt && (
              <Text style={styles.userMetaText}>
                Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      ))}

      {usersData && usersData.totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.paginationButton, page === 1 && styles.disabledButton]}
            onPress={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <Text style={styles.paginationButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.paginationInfo}>
            Page {page} of {usersData.totalPages}
          </Text>
          
          <TouchableOpacity
            style={[styles.paginationButton, page === usersData.totalPages && styles.disabledButton]}
            onPress={() => setPage(Math.min(usersData.totalPages, page + 1))}
            disabled={page === usersData.totalPages}
          >
            <Text style={styles.paginationButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function AppealsTab() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  
  const { data: appeals, isLoading } = trpc.admin.getAppeals.useQuery({ status: statusFilter });
  
  const reviewAppealMutation = trpc.admin.reviewAppeal.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Appeal reviewed successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleReviewAppeal = (appealId: string, status: 'approved' | 'rejected', userName: string) => {
    Alert.prompt(
      `${status === 'approved' ? 'Approve' : 'Reject'} Appeal`,
      `Enter notes for ${status === 'approved' ? 'approving' : 'rejecting'} ${userName}'s appeal:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'approved' ? 'Approve' : 'Reject',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: (notes) => {
            reviewAppealMutation.mutate({
              appealId,
              status,
              adminNotes: notes || undefined,
            });
          },
        },
      ],
      'plain-text'
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading appeals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Appeal Management</Text>
      
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, statusFilter === status && styles.activeFilterButton]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterButtonText, statusFilter === status && styles.activeFilterButtonText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {appeals?.map((appeal: any) => (
        <View key={appeal.id} style={styles.appealCard}>
          <View style={styles.appealHeader}>
            <View style={styles.appealUserInfo}>
              <Text style={styles.appealUserName}>{appeal.userName}</Text>
              <Text style={styles.appealUserEmail}>{appeal.userEmail}</Text>
              <Text style={styles.appealUserRole}>{appeal.userRole}</Text>
            </View>
            <View style={[styles.appealStatus, { backgroundColor: getAppealStatusColor(appeal.status) }]}>
              <Text style={styles.appealStatusText}>{appeal.status}</Text>
            </View>
          </View>
          
          <View style={styles.appealContent}>
            <Text style={styles.appealReason}>Reason: {appeal.reason}</Text>
            <Text style={styles.appealDescription}>{appeal.description}</Text>
          </View>
          
          <Text style={styles.appealDate}>
            Submitted: {new Date(appeal.createdAt).toLocaleDateString()}
          </Text>
          
          {appeal.status === 'pending' && (
            <View style={styles.appealActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleReviewAppeal(appeal.id, 'approved', appeal.userName)}
              >
                <CheckCircle size={16} color={theme.success} />
                <Text style={[styles.actionButtonText, { color: theme.success }]}>Approve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReviewAppeal(appeal.id, 'rejected', appeal.userName)}
              >
                <XCircle size={16} color={theme.error} />
                <Text style={[styles.actionButtonText, { color: theme.error }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {appeal.reviewedAt && (
            <View style={styles.reviewInfo}>
              <Text style={styles.reviewedBy}>Reviewed by: {appeal.reviewedBy}</Text>
              <Text style={styles.reviewedAt}>
                Reviewed: {new Date(appeal.reviewedAt).toLocaleDateString()}
              </Text>
              {appeal.adminNotes && (
                <Text style={styles.adminNotes}>Notes: {appeal.adminNotes}</Text>
              )}
            </View>
          )}
        </View>
      ))}

      {appeals?.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No appeals found</Text>
        </View>
      )}
    </View>
  );
}

function ActivityTab() {
  const { data: activities, isLoading } = trpc.admin.getActivityLogs.useQuery({ limit: 50 });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading activity logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      
      {activities?.map((activity: any) => (
        <View key={activity.id} style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityAction}>{activity.action.replace('_', ' ')}</Text>
            <Text style={styles.activityTime}>
              {new Date(activity.timestamp).toLocaleString()}
            </Text>
          </View>
          
          <Text style={styles.activityUser}>By: {activity.userEmail}</Text>
          <Text style={styles.activityDetails}>{activity.details}</Text>
        </View>
      ))}

      {activities?.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No activity logs found</Text>
        </View>
      )}
    </View>
  );
}

function getAppealStatusColor(status: string) {
  switch (status) {
    case 'pending': return theme.warning;
    case 'approved': return theme.success;
    case 'rejected': return theme.error;
    default: return theme.gray[400];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  signOutButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signOutHeaderText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabButtonText: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabButtonText: {
    color: theme.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.text.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: theme.text.secondary,
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  roleStats: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  roleStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  roleStatLabel: {
    fontSize: 16,
    color: theme.text.primary,
  },
  roleStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  flaggedUserCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.error,
  },
  flaggedUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flaggedUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  flaggedUserRole: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  flaggedUserReason: {
    fontSize: 14,
    color: theme.error,
    marginBottom: 4,
  },
  flaggedUserCount: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: theme.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginRight: 12,
    minWidth: 60,
  },
  filterScroll: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: theme.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: theme.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.text.primary,
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: theme.primary,
    textTransform: 'capitalize',
  },
  userActions: {
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  suspendButton: {
    borderColor: theme.error,
    backgroundColor: theme.gray[50],
  },
  unsuspendButton: {
    borderColor: theme.success,
    backgroundColor: theme.gray[50],
  },
  approveButton: {
    borderColor: theme.success,
    backgroundColor: theme.gray[50],
    marginRight: 8,
  },
  rejectButton: {
    borderColor: theme.error,
    backgroundColor: theme.gray[50],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  suspensionInfo: {
    backgroundColor: theme.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suspensionReason: {
    fontSize: 14,
    color: theme.error,
    marginBottom: 4,
  },
  suspensionDate: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userMetaText: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  paginationButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: theme.gray[300],
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationInfo: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  appealCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appealUserInfo: {
    flex: 1,
  },
  appealUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 4,
  },
  appealUserEmail: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 4,
  },
  appealUserRole: {
    fontSize: 14,
    color: theme.primary,
    textTransform: 'capitalize',
  },
  appealStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appealStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appealContent: {
    marginBottom: 12,
  },
  appealReason: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 8,
  },
  appealDescription: {
    fontSize: 14,
    color: theme.text.secondary,
    lineHeight: 20,
  },
  appealDate: {
    fontSize: 12,
    color: theme.text.secondary,
    marginBottom: 12,
  },
  appealActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewInfo: {
    backgroundColor: theme.gray[50],
    padding: 12,
    borderRadius: 8,
  },
  reviewedBy: {
    fontSize: 12,
    color: theme.text.secondary,
    marginBottom: 4,
  },
  reviewedAt: {
    fontSize: 12,
    color: theme.text.secondary,
    marginBottom: 4,
  },
  adminNotes: {
    fontSize: 14,
    color: theme.text.primary,
  },
  activityCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  activityUser: {
    fontSize: 14,
    color: theme.primary,
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 14,
    color: theme.text.secondary,
    lineHeight: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  clickableStatCard: {
    opacity: 0.8,
  },
});