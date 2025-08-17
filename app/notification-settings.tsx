import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, BellOff, Briefcase, MessageCircle, Calendar, FileText } from 'lucide-react-native';
import { useNotifications } from '@/hooks/notifications-store';
import { useUser } from '@/hooks/user-store';

export default function NotificationSettingsScreen() {
  const {
    settings,
    enableNotifications,
    disableNotifications,
    updateSetting,
    simulateJobAlert,
    simulateMessageAlert,
    simulateEventUpdate,
    simulateProposalAlert,
  } = useNotifications();
  const { userRole } = useUser();

  const handleEnableNotifications = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Platform',
        'Push notifications are not supported on web. Local notifications will be logged to console.',
        [{ text: 'OK' }]
      );
    }
    await enableNotifications();
  };

  const handleDisableNotifications = () => {
    Alert.alert(
      'Disable Notifications',
      'Are you sure you want to disable all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: disableNotifications },
      ]
    );
  };

  const testNotifications = () => {
    Alert.alert(
      'Test Notifications',
      'Choose a notification type to test:',
      [
        ...(userRole === 'contractor' ? [{
          text: 'Job Alert',
          onPress: () => simulateJobAlert('San Francisco, CA', 'Event Staff'),
        }] : []),
        {
          text: 'Message',
          onPress: () => simulateMessageAlert('John Doe'),
        },
        ...(userRole === 'business_owner' ? [{
          text: 'Event Update',
          onPress: () => simulateEventUpdate('Tech Conference 2024', 'New contractor assigned'),
        }] : []),
        ...(userRole === 'event_host' ? [{
          text: 'Proposal',
          onPress: () => simulateProposalAlert('ABC Events Co.'),
        }] : []),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notification Settings',
          headerStyle: { backgroundColor: '#f8f9fa' },
        }}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Push Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications on your device
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={settings.enabled ? handleDisableNotifications : handleEnableNotifications}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={settings.enabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Types</Text>
              
              {userRole === 'contractor' && (
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingLabelRow}>
                      <Briefcase size={20} color="#FF6B35" />
                      <Text style={styles.settingLabel}>Job Alerts</Text>
                    </View>
                    <Text style={styles.settingDescription}>
                      Get notified when new jobs are available in your area
                    </Text>
                  </View>
                  <Switch
                    value={settings.jobAlerts}
                    onValueChange={(value) => updateSetting('jobAlerts', value)}
                    trackColor={{ false: '#e0e0e0', true: '#FF6B35' }}
                    thumbColor={settings.jobAlerts ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              )}

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingLabelRow}>
                    <MessageCircle size={20} color="#34C759" />
                    <Text style={styles.settingLabel}>Messages</Text>
                  </View>
                  <Text style={styles.settingDescription}>
                    Get notified when you receive new messages
                  </Text>
                </View>
                <Switch
                  value={settings.messageAlerts}
                  onValueChange={(value) => updateSetting('messageAlerts', value)}
                  trackColor={{ false: '#e0e0e0', true: '#34C759' }}
                  thumbColor={settings.messageAlerts ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              {userRole === 'business_owner' && (
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingLabelRow}>
                      <Calendar size={20} color="#AF52DE" />
                      <Text style={styles.settingLabel}>Event Updates</Text>
                    </View>
                    <Text style={styles.settingDescription}>
                      Get notified about updates to your events
                    </Text>
                  </View>
                  <Switch
                    value={settings.eventUpdates}
                    onValueChange={(value) => updateSetting('eventUpdates', value)}
                    trackColor={{ false: '#e0e0e0', true: '#AF52DE' }}
                    thumbColor={settings.eventUpdates ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              )}

              {userRole === 'event_host' && (
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingLabelRow}>
                      <FileText size={20} color="#FF9500" />
                      <Text style={styles.settingLabel}>Proposals</Text>
                    </View>
                    <Text style={styles.settingDescription}>
                      Get notified when you receive new proposals
                    </Text>
                  </View>
                  <Switch
                    value={settings.proposalAlerts}
                    onValueChange={(value) => updateSetting('proposalAlerts', value)}
                    trackColor={{ false: '#e0e0e0', true: '#FF9500' }}
                    thumbColor={settings.proposalAlerts ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity style={styles.testButton} onPress={testNotifications}>
                <Bell size={20} color="#007AFF" />
                <Text style={styles.testButtonText}>Test Notifications</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!settings.enabled && (
          <View style={styles.disabledSection}>
            <BellOff size={48} color="#8E8E93" />
            <Text style={styles.disabledTitle}>Notifications Disabled</Text>
            <Text style={styles.disabledDescription}>
              Enable notifications to stay updated with important information about jobs, messages, and events.
            </Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            • Notifications help you stay informed about important updates{'\n'}
            • You can customize which types of notifications you receive{'\n'}
            • All notifications respect your device&apos;s Do Not Disturb settings{'\n'}
            • You can disable notifications at any time
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  disabledSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  disabledDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});