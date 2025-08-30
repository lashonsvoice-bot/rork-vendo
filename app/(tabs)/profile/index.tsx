import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import {
  User,
  Settings,
  LogOut,
  Shield,
  FileText,
  Play,
  CheckCircle,
  Clock,
  Star,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Globe,
  Edit3,
  Save,
  X,
  Store,
  Package,
  AlertTriangle,

  Upload,
  Trash2,
  ExternalLink,
  Bell,
  Moon,
  Sun,
  Monitor,
  XCircle,
} from "lucide-react-native";
import { useUser } from "@/hooks/user-store";
import { useAuth } from "@/hooks/auth-store";
import { useNotifications } from "@/hooks/notifications-store";
import { useTheme } from "@/hooks/theme-store";
import { trpc } from "@/lib/trpc";
import { Stack, router } from "expo-router";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, themeMode, isDark, setThemeMode } = useTheme();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            console.log('[ProfileScreen] Logging out...');
            try {
              await logout();
              console.log('[ProfileScreen] Logout complete');
              // The AuthGuard will handle navigation after logout
            } catch (error) {
              console.error('[ProfileScreen] Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile-edit');
  };

  const handleSaveProfile = async () => {
    Alert.alert('Info', 'Profile editing is not implemented in this demo.');
    setIsEditModalVisible(false);
  };

  const getBusinessTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      sole_proprietor: 'Sole Proprietor',
      llc: 'LLC',
      partnership: 'Partnership',
      corporation: 'Corporation',
      s_corp: 'S-Corporation',
      non_profit: 'Non-Profit'
    };
    return types[type || ''] || 'Not specified';
  };

  const handleTrainingComplete = (documentId: string) => {
    Alert.alert("Training Completed", "Great job! You've completed this training module.");
  };

  const renderContractorProfile = () => {
    if (!user) return null;

    const mockTrainingDocuments = [
      { id: '1', title: 'Safety Training', type: 'video', completed: true, required: true },
      { id: '2', title: 'Customer Service', type: 'document', completed: false, required: true },
      { id: '3', title: 'Brand Guidelines', type: 'document', completed: false, required: false },
    ];

    const completedTraining = mockTrainingDocuments.filter(doc => doc.completed).length;
    const totalTraining = mockTrainingDocuments.length;
    const pendingTraining = mockTrainingDocuments.filter(doc => !doc.completed).length;
    const requiredTraining = mockTrainingDocuments.filter(doc => doc.required).length;
    const completedRequired = mockTrainingDocuments.filter(doc => doc.required && doc.completed).length;

    const handlePickResume = async () => {
      Alert.alert('Info', 'Resume upload is not implemented in this demo.');
    };

    const handleRemoveResume = async () => {
      Alert.alert('Info', 'Resume removal is not implemented in this demo.');
    };

    const handleViewResume = async () => {
      Alert.alert('Info', 'Resume viewing is not implemented in this demo.');
    };

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Stack.Screen options={{ title: "Contractor Profile" }} />
        
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <User size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Available for Work</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Star size={20} color="#F59E0B" />
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Briefcase size={20} color="#6366F1" />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.statValue}>{pendingTraining}</Text>
            <Text style={styles.statLabel}>Training Pending</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Edit3 size={16} color="#10B981" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Mail size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.infoText}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.infoText}>San Francisco, CA</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.infoText}>Born: 1990-01-01</Text>
            </View>
            <View style={styles.infoRow}>
              <Star size={16} color="#6B7280" />
              <Text style={styles.infoText}>Skills: Event Setup, Customer Service, Sales</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          <View style={styles.infoCard}>
            {false ? (
              <View style={{ gap: 12 }}>
                <View style={styles.infoRow}>
                  <FileText size={16} color="#6B7280" />
                  <Text style={styles.infoText} numberOfLines={2}>Resume file</Text>
                </View>
                <View style={styles.resumeActions}>
                  <TouchableOpacity style={styles.resumeBtnPrimary} onPress={handleViewResume} testID="view-resume">
                    <ExternalLink size={16} color="#FFFFFF" />
                    <Text style={styles.resumeBtnPrimaryText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resumeBtnSecondary} onPress={handlePickResume} testID="replace-resume">
                    <Upload size={16} color="#10B981" />
                    <Text style={styles.resumeBtnSecondaryText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resumeBtnDanger} onPress={handleRemoveResume} testID="remove-resume">
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.resumeBtnDangerText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#6B7280' }}>Upload your resume (PDF or DOC/DOCX)</Text>
                <TouchableOpacity style={styles.resumeBtnPrimary} onPress={handlePickResume} testID="upload-resume">
                  <Upload size={16} color="#FFFFFF" />
                  <Text style={styles.resumeBtnPrimaryText}>Upload Resume</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <View style={styles.verificationCard}>
            <View style={styles.verificationItem}>
              <Shield size={20} color="#10B981" />
              <Text style={styles.verificationText}>ID Verification</Text>
              <CheckCircle size={16} color="#10B981" />
            </View>
            <View style={styles.verificationItem}>
              <FileText size={20} color="#10B981" />
              <Text style={styles.verificationText}>Documents</Text>
              <CheckCircle size={16} color="#10B981" />
            </View>
            <View style={styles.verificationItem}>
              <Play size={20} color="#F59E0B" />
              <Text style={styles.verificationText}>Training ({completedRequired}/{requiredTraining} required)</Text>
              <Clock size={16} color="#6B7280" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Modules</Text>
          {mockTrainingDocuments.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.trainingCard,
                doc.completed && styles.trainingCardCompleted
              ]}
              onPress={() => !doc.completed && handleTrainingComplete(doc.id)}
              disabled={doc.completed}
            >
              <View style={styles.trainingIcon}>
                {doc.type === 'video' ? (
                  <Play size={20} color={doc.completed ? "#10B981" : "#6366F1"} />
                ) : (
                  <FileText size={20} color={doc.completed ? "#10B981" : "#6366F1"} />
                )}
              </View>
              <View style={styles.trainingContent}>
                <Text style={styles.trainingTitle}>{doc.title}</Text>
                <Text style={styles.trainingType}>
                  {doc.type === 'video' ? 'Video Training' : 'Document'}
                  {doc.required && ' • Required'}
                </Text>
              </View>
              <View style={styles.trainingStatus}>
                {doc.completed ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <Clock size={20} color="#6B7280" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.themeSection}>
            <Text style={styles.themeSectionTitle}>Theme</Text>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Sun size={16} color={themeMode === 'light' ? '#F59E0B' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'light' && styles.themeOptionTextSelected
                ]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Moon size={16} color={themeMode === 'dark' ? '#6366F1' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'dark' && styles.themeOptionTextSelected
                ]}>Dark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('system')}
              >
                <Monitor size={16} color={themeMode === 'system' ? '#10B981' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'system' && styles.themeOptionTextSelected
                ]}>System</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => router.push('/event-selection-cancel')}
          >
            <XCircle size={24} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Cancel Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderBusinessOwnerProfile = () => {
    if (!user) return null;

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Stack.Screen options={{ title: "Business Profile" }} />
        
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Building2 size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>Demo Business Inc.</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Business Owner</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Calendar size={20} color="#6366F1" />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Active Events</Text>
          </View>
          <View style={styles.statCard}>
            <User size={20} color="#10B981" />
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Contractors</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={20} color="#F59E0B" />
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Edit3 size={16} color="#6366F1" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Building2 size={16} color="#6B7280" />
              <Text style={styles.infoText}>Demo Business Inc.</Text>
            </View>
            <View style={styles.infoRow}>
              <Mail size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.infoText}>+1 (555) 987-6543</Text>
            </View>
            <View style={styles.infoRow}>
              <Globe size={16} color="#6B7280" />
              <Text style={styles.infoText}>https://demobusiness.com</Text>
            </View>
            <View style={styles.infoRow}>
              <Settings size={16} color="#6B7280" />
              <Text style={styles.infoText}>Type: LLC</Text>
            </View>
            <View style={styles.infoRow}>
              <FileText size={16} color="#6B7280" />
              <Text style={styles.infoText}>EIN/TIN: 12-3456789</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.notificationIconContainer}>
              <Bell size={20} color="#6B7280" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.settingText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/notification-settings')}
          >
            <Settings size={20} color="#6B7280" />
            <Text style={styles.settingText}>Notification Settings</Text>
          </TouchableOpacity>
          <View style={styles.themeSection}>
            <Text style={styles.themeSectionTitle}>Theme</Text>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Sun size={16} color={themeMode === 'light' ? '#F59E0B' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'light' && styles.themeOptionTextSelected
                ]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Moon size={16} color={themeMode === 'dark' ? '#6366F1' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'dark' && styles.themeOptionTextSelected
                ]}>Dark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('system')}
              >
                <Monitor size={16} color={themeMode === 'system' ? '#10B981' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'system' && styles.themeOptionTextSelected
                ]}>System</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/training-materials')}
          >
            <FileText size={20} color="#6B7280" />
            <Text style={styles.settingText}>Training Materials</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <User size={20} color="#6B7280" />
            <Text style={styles.settingText}>Contractor Management</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/debug-connection')}
          >
            <Settings size={20} color="#6B7280" />
            <Text style={styles.settingText}>Debug Connection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => router.push('/event-selection-cancel')}
          >
            <XCircle size={24} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Cancel Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderEventHostProfile = () => {
    if (!user) return null;

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Stack.Screen options={{ title: "Host Profile" }} />
        
        <LinearGradient
          colors={["#F59E0B", "#FBBF24"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Store size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>Demo Events LLC</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Event Host</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Calendar size={20} color="#F59E0B" />
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Events Hosted</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={20} color="#F59E0B" />
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={20} color="#F59E0B" />
            <Text style={styles.statValue}>CA</Text>
            <Text style={styles.statLabel}>State</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Host Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Edit3 size={16} color="#F59E0B" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Building2 size={16} color="#6B7280" />
              <Text style={styles.infoText}>Demo Events LLC</Text>
            </View>
            <View style={styles.infoRow}>
              <Mail size={16} color="#6B7280" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.infoText}>+1 (555) 456-7890</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.infoText}>Los Angeles, CA</Text>
            </View>
            <View style={styles.infoRow}>
              <Globe size={16} color="#6B7280" />
              <Text style={styles.infoText}>https://demoevents.com</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables Management</Text>
          <View style={styles.deliverablesCard}>
            <View style={styles.deliverablesHeader}>
              <Package size={20} color="#10B981" />
              <Text style={styles.deliverablesTitle}>Accept Deliverables for Events</Text>
              <View style={[styles.deliverablesBadge, styles.deliverablesBadgeYes]}>
                <Text style={[styles.deliverablesBadgeText, styles.deliverablesBadgeTextYes]}>YES</Text>
              </View>
            </View>
            
            <Text style={styles.deliverablesDescription}>
              You agree to accept and sign for event deliverables from business owners.
            </Text>
            
            <View style={styles.deliveryAddressSection}>
              <Text style={styles.deliveryAddressLabel}>Delivery Address:</Text>
              <Text style={styles.deliveryAddressText}>Same as event address</Text>
            </View>
            

          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.notificationIconContainer}>
              <Bell size={20} color="#6B7280" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.settingText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/notification-settings')}
          >
            <Settings size={20} color="#6B7280" />
            <Text style={styles.settingText}>Notification Settings</Text>
          </TouchableOpacity>
          <View style={styles.themeSection}>
            <Text style={styles.themeSectionTitle}>Theme</Text>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Sun size={16} color={themeMode === 'light' ? '#F59E0B' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'light' && styles.themeOptionTextSelected
                ]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Moon size={16} color={themeMode === 'dark' ? '#6366F1' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'dark' && styles.themeOptionTextSelected
                ]}>Dark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeMode('system')}
              >
                <Monitor size={16} color={themeMode === 'system' ? '#10B981' : '#6B7280'} />
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'system' && styles.themeOptionTextSelected
                ]}>System</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/(tabs)/events')}
          >
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.settingText}>Event Management</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/business-directory')}
          >
            <User size={20} color="#6B7280" />
            <Text style={styles.settingText}>Vendor Management</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => router.push('/event-selection-cancel')}
          >
            <XCircle size={24} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Cancel Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderEditModal = () => {
    if (!isEditModalVisible || !editFormData) return null;

    return (
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setIsEditModalVisible(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              style={styles.modalSaveButton} 
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <Save size={20} color="#10B981" />
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.name || ''}
                onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.email || ''}
                onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.phone || ''}
                onChangeText={(text) => setEditFormData({ ...editFormData, phone: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            {user?.role === 'business_owner' && (
              <>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Business Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.businessName || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, businessName: text })}
                    placeholder="Enter business name"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Website (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.website || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, website: text })}
                    placeholder="Enter website URL"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Business Type (Optional)</Text>
                  <View style={styles.businessTypeContainer}>
                    {[
                      { key: 'sole_proprietor', label: 'Sole Proprietor' },
                      { key: 'llc', label: 'LLC' },
                      { key: 'partnership', label: 'Partnership' },
                      { key: 'corporation', label: 'Corporation' },
                      { key: 's_corp', label: 'S-Corporation' },
                      { key: 'non_profit', label: 'Non-Profit' }
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.businessTypeOption,
                          editFormData.businessType === type.key && styles.businessTypeOptionSelected
                        ]}
                        onPress={() => setEditFormData({ ...editFormData, businessType: type.key })}
                      >
                        <Text style={[
                          styles.businessTypeOptionText,
                          editFormData.businessType === type.key && styles.businessTypeOptionTextSelected
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>EIN/TIN Number (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.einTin || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, einTin: text })}
                    placeholder="Enter EIN or TIN number"
                  />
                </View>
              </>
            )}

            {user?.role === 'contractor' && (
              <>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Location</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.location || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
                    placeholder="Enter your location (City, State)"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.dateOfBirth || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, dateOfBirth: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </>
            )}

            {user?.role === 'event_host' && (
              <>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Organization Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.organizationName || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, organizationName: text })}
                    placeholder="Enter organization name"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Location</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.location || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
                    placeholder="Enter location (City, State)"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Website (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFormData.website || ''}
                    onChangeText={(text) => setEditFormData({ ...editFormData, website: text })}
                    placeholder="Enter website URL"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Accept Deliverables for Events</Text>
                  <View style={styles.deliverableOptionsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.deliverableOption,
                        editFormData.acceptsDeliverables === true && styles.deliverableOptionSelected
                      ]}
                      onPress={() => setEditFormData({ ...editFormData, acceptsDeliverables: true })}
                    >
                      <Text style={[
                        styles.deliverableOptionText,
                        editFormData.acceptsDeliverables === true && styles.deliverableOptionTextSelected
                      ]}>
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.deliverableOption,
                        editFormData.acceptsDeliverables === false && styles.deliverableOptionSelected
                      ]}
                      onPress={() => setEditFormData({ ...editFormData, acceptsDeliverables: false })}
                    >
                      <Text style={[
                        styles.deliverableOptionText,
                        editFormData.acceptsDeliverables === false && styles.deliverableOptionTextSelected
                      ]}>
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {editFormData.acceptsDeliverables === false && (
                    <Text style={styles.deliverableWarning}>
                      Selecting &quot;No&quot; may limit your business opportunities
                    </Text>
                  )}
                </View>

                {editFormData.acceptsDeliverables && (
                  <View style={styles.modalInputContainer}>
                    <Text style={styles.modalInputLabel}>Delivery Address</Text>
                    <View style={styles.deliveryAddressOptions}>
                      <TouchableOpacity
                        style={[
                          styles.addressOption,
                          !editFormData.deliveryAddress && styles.addressOptionSelected
                        ]}
                        onPress={() => setEditFormData({ ...editFormData, deliveryAddress: '' })}
                      >
                        <Text style={[
                          styles.addressOptionText,
                          !editFormData.deliveryAddress && styles.addressOptionTextSelected
                        ]}>
                          Same as event address
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.addressOption,
                          editFormData.deliveryAddress && styles.addressOptionSelected
                        ]}
                        onPress={() => setEditFormData({ ...editFormData, deliveryAddress: editFormData.location || '' })}
                      >
                        <Text style={[
                          styles.addressOptionText,
                          editFormData.deliveryAddress && styles.addressOptionTextSelected
                        ]}>
                          Different address
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {editFormData.deliveryAddress && (
                      <TextInput
                        style={[styles.modalInput, { marginTop: 12 }]}
                        value={editFormData.deliveryAddress || ''}
                        onChangeText={(text) => setEditFormData({ ...editFormData, deliveryAddress: text })}
                        placeholder="Enter delivery address"
                        multiline
                      />
                    )}
                  </View>
                )}
              </>
            )}

            <View style={styles.modalBottomSpacing} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (user?.role === 'contractor') {
    return (
      <>
        {renderContractorProfile()}
        {renderEditModal()}
      </>
    );
  }

  if (user?.role === 'business_owner') {
    return (
      <>
        {renderBusinessOwnerProfile()}
        {renderEditModal()}
      </>
    );
  }

  if (user?.role === 'event_host') {
    return (
      <>
        {renderEventHostProfile()}
        {renderEditModal()}
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Please select a role to continue</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 20 : 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileInfo: {
    alignItems: "center",
    marginTop: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: "#E0E7FF",
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginTop: -20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  verificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  verificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  verificationText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  trainingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trainingCardCompleted: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  trainingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  trainingContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  trainingType: {
    fontSize: 14,
    color: "#6B7280",
  },
  trainingStatus: {
    marginLeft: 12,
  },
  settingItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  resumeBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  resumeBtnSecondaryText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  resumeBtnDangerText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
    marginTop: 100,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  businessTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  businessTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  businessTypeOptionSelected: {
    backgroundColor: "#EBF8FF",
    borderColor: "#6366F1",
  },
  businessTypeOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  businessTypeOptionTextSelected: {
    color: "#6366F1",
    fontWeight: "600",
  },
  modalBottomSpacing: {
    height: 40,
  },
  deliverablesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deliverablesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  deliverablesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  deliverablesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliverablesBadgeYes: {
    backgroundColor: "#D1FAE5",
  },
  deliverablesBadgeNo: {
    backgroundColor: "#FEE2E2",
  },
  deliverablesBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deliverablesBadgeTextYes: {
    color: "#065F46",
  },
  deliverablesBadgeTextNo: {
    color: "#991B1B",
  },
  deliverablesDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  deliveryAddressSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  deliveryAddressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  deliveryAddressText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  warningSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },
  deliverableOptionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  deliverableOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  deliverableOptionSelected: {
    backgroundColor: "#EBF8FF",
    borderColor: "#3B82F6",
  },
  deliverableOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  deliverableOptionTextSelected: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  deliverableWarning: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
    fontStyle: "italic",
  },
  deliveryAddressOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  addressOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  addressOptionSelected: {
    backgroundColor: "#EBF8FF",
    borderColor: "#3B82F6",
  },
  addressOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  addressOptionTextSelected: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  themeSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  themeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  themeOptionSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  themeOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#B91C1C',
  },
  emergencyButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});