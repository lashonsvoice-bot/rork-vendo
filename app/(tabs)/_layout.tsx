import { Tabs } from "expo-router";
import { Home, Calendar, Plus, User, Book, Users } from "lucide-react-native";
import React, { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import { useUser } from "@/hooks/user-store";
import { useTheme } from "@/hooks/theme-store";

export default function TabLayout() {
  const { userRole } = useUser();
  const { theme } = useTheme();
  console.log('[Tabs] Using theme', theme);

  const eventsTab = useMemo(() => {
    const isContractor = userRole === "contractor";
    return {
      title: isContractor ? "Opportunities" : "Hire Contractors",
      Icon: isContractor ? Book : Calendar,
    } as const;
  }, [userRole]);

  const createTabTitle = useMemo(() => {
    return "List Opportunity";
  }, [userRole]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentCyan,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600" as const,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === "ios" ? 8 : 6,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 64 : 60,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={26} color={color ?? theme.accentCyan} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: eventsTab.title,
          tabBarIcon: ({ color }) => <eventsTab.Icon size={26} color={color ?? theme.accentCyan} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: createTabTitle,
          tabBarIcon: ({ color }) => <Plus size={26} color={color ?? theme.accentCyan} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Users size={26} color={color ?? theme.accentCyan} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={26} color={color ?? theme.accentCyan} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});