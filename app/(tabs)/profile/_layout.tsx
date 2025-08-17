import { Stack } from "expo-router";
import { neonTheme } from "@/constants/theme";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Profile",
          headerStyle: {
            backgroundColor: neonTheme.surface,
          },
          headerTintColor: neonTheme.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold" as const,
          },
        }} 
      />
    </Stack>
  );
}