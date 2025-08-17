import { Stack } from "expo-router";
import { neonTheme } from "@/constants/theme";

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Events",
          headerStyle: {
            backgroundColor: neonTheme.surface,
          },
          headerTintColor: neonTheme.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold" as const,
          },
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: "Event Details",
          headerStyle: {
            backgroundColor: neonTheme.surface,
          },
          headerTintColor: neonTheme.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold" as const,
          },
        }} 
      />
      <Stack.Screen
        name="host"
        options={{
          title: "Host Dashboard",
          headerStyle: {
            backgroundColor: neonTheme.surface,
          },
          headerTintColor: neonTheme.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold" as const,
          },
        }}
      />
      <Stack.Screen
        name="manage/[id]"
        options={{
          title: "Manage Vendors",
          headerShown: false,
        }}
      />
    </Stack>
  );
}