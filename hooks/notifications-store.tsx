import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/auth-store";
import { useUser } from "@/hooks/user-store";

export interface NotificationSettings {
  jobAlerts: boolean;
  messageAlerts: boolean;
  eventUpdates: boolean;
  proposalAlerts: boolean;
  enabled: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  userId: string;
  type: 'job_alert' | 'message' | 'event_update' | 'proposal';
  read: boolean;
  createdAt: string;
}

const NOTIFICATION_SETTINGS_KEY = "notification_settings";
const PUSH_TOKEN_KEY = "push_token";
const NOTIFICATIONS_KEY = "notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [settings, setSettings] = useState<NotificationSettings>({
    jobAlerts: false,
    messageAlerts: false,
    eventUpdates: false,
    proposalAlerts: false,
    enabled: false,
  });
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user: authUser } = useAuth();
  const { userRole } = useUser();

  useEffect(() => {
    loadSettings();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (authUser && settings.enabled) {
      registerForPushNotifications();
    }
  }, [authUser, settings.enabled]);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  };

  const saveNotifications = async (newNotifications: PushNotification[]) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newNotifications));
      setNotifications(newNotifications);
    } catch (error) {
      console.error("Error saving notifications:", error);
    }
  };

  const registerForPushNotifications = async () => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return;
    }

    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.log('Project ID not found');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('Push token:', token.data);
      
      setPushToken(token.data);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const enableNotifications = useCallback(async () => {
    const newSettings = { ...settings, enabled: true };
    await saveSettings(newSettings);
    await registerForPushNotifications();
  }, [settings]);

  const disableNotifications = useCallback(async () => {
    const newSettings = {
      jobAlerts: false,
      messageAlerts: false,
      eventUpdates: false,
      proposalAlerts: false,
      enabled: false,
    };
    await saveSettings(newSettings);
    setPushToken(null);
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }, []);

  const updateSetting = useCallback(async (key: keyof Omit<NotificationSettings, 'enabled'>, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);
  }, [settings]);

  const sendLocalNotification = useCallback(async (title: string, body: string, data?: any) => {
    if (!settings.enabled) return;

    if (Platform.OS === 'web') {
      console.log('Local notification (web):', { title, body, data });
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }, [settings.enabled]);

  const addNotification = useCallback(async (notification: Omit<PushNotification, 'id' | 'createdAt' | 'read'>) => {
    if (!authUser) return;

    const newNotification: PushNotification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const updatedNotifications = [newNotification, ...notifications];
    await saveNotifications(updatedNotifications);

    const shouldNotify = (
      (notification.type === 'job_alert' && settings.jobAlerts) ||
      (notification.type === 'message' && settings.messageAlerts) ||
      (notification.type === 'event_update' && settings.eventUpdates) ||
      (notification.type === 'proposal' && settings.proposalAlerts)
    );

    if (shouldNotify) {
      await sendLocalNotification(notification.title, notification.body, notification.data);
    }
  }, [authUser, notifications, settings, sendLocalNotification]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    await saveNotifications(updatedNotifications);
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    await saveNotifications(updatedNotifications);
  }, [notifications]);

  const clearNotifications = useCallback(async () => {
    await saveNotifications([]);
  }, []);

  const simulateJobAlert = useCallback(async (location: string, jobType: string) => {
    if (userRole !== 'contractor') return;
    
    await addNotification({
      title: 'New Job Available!',
      body: `${jobType} position available in ${location}`,
      userId: authUser?.id || '',
      type: 'job_alert',
      data: { location, jobType },
    });
  }, [userRole, authUser, addNotification]);

  const simulateMessageAlert = useCallback(async (senderName: string) => {
    await addNotification({
      title: 'New Message',
      body: `${senderName} sent you a message`,
      userId: authUser?.id || '',
      type: 'message',
      data: { senderName },
    });
  }, [authUser, addNotification]);

  const simulateEventUpdate = useCallback(async (eventName: string, updateType: string) => {
    if (userRole !== 'business_owner') return;
    
    await addNotification({
      title: 'Event Update',
      body: `${updateType} for ${eventName}`,
      userId: authUser?.id || '',
      type: 'event_update',
      data: { eventName, updateType },
    });
  }, [userRole, authUser, addNotification]);

  const simulateProposalAlert = useCallback(async (businessName: string) => {
    if (userRole !== 'event_host') return;
    
    await addNotification({
      title: 'New Proposal',
      body: `${businessName} sent you a proposal`,
      userId: authUser?.id || '',
      type: 'proposal',
      data: { businessName },
    });
  }, [userRole, authUser, addNotification]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const getNotificationsByType = useCallback((type: PushNotification['type']) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  return useMemo(() => ({
    settings,
    pushToken,
    notifications,
    unreadCount,
    isLoading,
    enableNotifications,
    disableNotifications,
    updateSetting,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationsByType,
    simulateJobAlert,
    simulateMessageAlert,
    simulateEventUpdate,
    simulateProposalAlert,
  }), [
    settings,
    pushToken,
    notifications,
    unreadCount,
    isLoading,
    enableNotifications,
    disableNotifications,
    updateSetting,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationsByType,
    simulateJobAlert,
    simulateMessageAlert,
    simulateEventUpdate,
    simulateProposalAlert,
  ]);
});