import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationComponent from '@/components/VerificationComponent';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-store';

export default function VerificationScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleVerificationComplete = () => {
    // Navigate back to profile or show success message
    router.back();
  };

  if (!user || user.role !== 'contractor') {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'ID Verification',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      <View style={styles.content}>
        <VerificationComponent onVerificationComplete={handleVerificationComplete} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
});