import { Stack } from "expo-router";
import { neonTheme } from "@/constants/theme";

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "RevoVend",
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